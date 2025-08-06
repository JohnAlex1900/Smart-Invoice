import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import {
  getAuth,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";

const baseUrl = "https://smart-invoice-9e36.onrender.com";

const profileFormSchema = z.object({
  email: z.string().email("Invalid email"),
  businessName: z.string().min(1, "Business name is required"),
  contactPerson: z.string().min(1, "Contact person is required"),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  defaultCurrency: z
    .string()
    .length(3, "Currency must be 3 letters (e.g. USD)"),
  defaultTaxRate: z
    .union([z.string(), z.number()])
    .transform((val) => val.toString())
    .refine((val) => !isNaN(parseFloat(val)), {
      message: "Tax rate must be a valid number",
    }),
  defaultPaymentTerms: z.number().int().min(0),
});

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Password confirmation is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export default function Settings() {
  const { toast } = useToast();
  const { user, getAuthHeaders } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const auth = getAuth();

  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      email: user?.email || "",
      businessName: user?.businessName || "",
      contactPerson: user?.contactPerson || "",
      phone: user?.phone || "",
      address: user?.address || "",
      defaultCurrency: user?.defaultCurrency || "USD",
      defaultTaxRate: user?.defaultTaxRate || "0",
      defaultPaymentTerms: user?.defaultPaymentTerms || 30,
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: z.infer<typeof profileFormSchema>) => {
      return apiRequest("PUT", `${baseUrl}/api/users/me`, profileData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      toast({
        title: "Success",
        description: "Profile updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (passwordData: z.infer<typeof passwordFormSchema>) => {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user || !user.email) {
        throw new Error("User is not authenticated.");
      }

      // Re-authenticate the user first
      const credential = EmailAuthProvider.credential(
        user.email,
        passwordData.currentPassword
      );

      await reauthenticateWithCredential(user, credential);

      // Then update password
      await updatePassword(user, passwordData.newPassword);
    },

    onSuccess: () => {
      passwordForm.reset();
      toast({
        title: "Success",
        description: "Password changed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onProfileSubmit = (data: z.infer<typeof profileFormSchema>) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: z.infer<typeof passwordFormSchema>) => {
    changePasswordMutation.mutate(data);
  };

  const handleExportData = async () => {
    try {
      setIsExporting(true);
      const [userDataRes, invoicesRes, clientsRes] = await Promise.all([
        apiRequest("GET", `${baseUrl}/api/users/me`),
        apiRequest("GET", `${baseUrl}/api/invoices`),
        apiRequest("GET", `${baseUrl}/api/clients`),
      ]);

      const [userData, invoicesData, clientsData] = await Promise.all([
        userDataRes.json(),
        invoicesRes.json(),
        clientsRes.json(),
      ]);

      const exportData = {
        user: userData,
        invoices: invoicesData,
        clients: clientsData,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "smart-invoice-export.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Success",
        description: "Your data has been exported successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false); // Stop loading
    }
  };

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) return;

    const confirmed = window.confirm(
      "Are you sure you want to permanently delete your account? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      setIsDeleting(true);

      await auth.currentUser.delete();

      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });

      // Optional: Redirect to login or homepage
      window.location.href = "/login";
    } catch (error: any) {
      if (error.code === "auth/requires-recent-login") {
        toast({
          title: "Reauthentication Required",
          description: "Please log in again and try deleting your account.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Deletion Failed",
          description: error.message || "An error occurred.",
          variant: "destructive",
        });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-2">
          Manage your account and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Business Profile
              </h3>
              <form
                onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="businessName">Business Name</Label>
                    <Input
                      id="businessName"
                      {...profileForm.register("businessName")}
                    />
                    {profileForm.formState.errors.businessName && (
                      <p className="text-sm text-red-600 mt-1">
                        {profileForm.formState.errors.businessName.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="contactPerson">Contact Person</Label>
                    <Input
                      id="contactPerson"
                      {...profileForm.register("contactPerson")}
                    />
                    {profileForm.formState.errors.contactPerson && (
                      <p className="text-sm text-red-600 mt-1">
                        {profileForm.formState.errors.contactPerson.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      {...profileForm.register("email")}
                    />
                    {profileForm.formState.errors.email && (
                      <p className="text-sm text-red-600 mt-1">
                        {profileForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      {...profileForm.register("phone")}
                    />
                    {profileForm.formState.errors.phone && (
                      <p className="text-sm text-red-600 mt-1">
                        {profileForm.formState.errors.phone.message}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="address">Business Address</Label>
                  <Textarea
                    id="address"
                    {...profileForm.register("address")}
                    placeholder="Enter your business address..."
                    rows={3}
                  />
                  {profileForm.formState.errors.address && (
                    <p className="text-sm text-red-600 mt-1">
                      {profileForm.formState.errors.address.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending
                    ? "Updating..."
                    : "Update Profile"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Security
              </h3>
              <form
                onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    {...passwordForm.register("currentPassword")}
                    placeholder="••••••••"
                  />
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="text-sm text-red-600 mt-1">
                      {passwordForm.formState.errors.currentPassword.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    {...passwordForm.register("newPassword")}
                    placeholder="••••••••"
                  />
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-sm text-red-600 mt-1">
                      {passwordForm.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...passwordForm.register("confirmPassword")}
                    placeholder="••••••••"
                  />
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-red-600 mt-1">
                      {passwordForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {changePasswordMutation.isPending
                    ? "Changing..."
                    : "Change Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Preferences */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Preferences
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="defaultCurrency">Default Currency</Label>
                  <Select
                    value={profileForm.watch("defaultCurrency")}
                    onValueChange={(value) =>
                      profileForm.setValue(
                        "defaultCurrency",
                        value as "USD" | "KES"
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="defaultTaxRate">Tax Rate (%)</Label>
                  <Input
                    id="defaultTaxRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    {...profileForm.register("defaultTaxRate")}
                  />
                </div>
                <div>
                  <Label htmlFor="defaultPaymentTerms">
                    Payment Terms (Days)
                  </Label>
                  <Input
                    id="defaultPaymentTerms"
                    type="number"
                    min="1"
                    {...profileForm.register("defaultPaymentTerms", {
                      valueAsNumber: true,
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Account Actions
              </h3>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleExportData}
                  disabled={isExporting}
                >
                  {isExporting ? "Exporting..." : "Export Data"}
                </Button>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete Account"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
