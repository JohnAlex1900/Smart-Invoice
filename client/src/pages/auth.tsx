import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { signIn, signUp, resetPassword } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Receipt } from "lucide-react";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { firebaseUser } = useAuth();
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    businessName: "",
    contactPerson: "",
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (firebaseUser) {
      setLocation("/");
    }
  }, [firebaseUser, setLocation]);

  if (firebaseUser) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "reset") {
        await resetPassword(formData.email);
        toast({
          title: "Password reset email sent",
          description: "Check your email for password reset instructions.",
        });
        setMode("login");
      } else if (mode === "login") {
        await signIn(formData.email, formData.password);
        setLocation("/");
      } else if (mode === "register") {
        if (formData.password !== formData.confirmPassword) {
          throw new Error("Passwords do not match");
        }

        const firebaseUser = await signUp(formData.email, formData.password);

        // 🔐 Ensure ID token is available before creating user in backend
        const idToken = await firebaseUser.getIdToken();

        // Send user creation request with auth header
        await apiRequest("POST", "/api/users", {
          email: formData.email,
          businessName: formData.businessName,
          contactPerson: formData.contactPerson,
          firebaseUid: firebaseUser.uid,
          defaultCurrency: "KES",
          defaultTaxRate: "0",
          defaultPaymentTerms: 30,
        });

        toast({
          title: "Account created successfully",
          description: "Welcome to InvoicePro!",
        });

        setLocation("/");
      }
    } catch (error: any) {
      console.error("Authentication error:", error);

      // Provide more helpful error messages
      let errorMessage = error.message;
      if (error.code === "auth/configuration-not-found") {
        errorMessage =
          "Firebase authentication is not properly configured. Please check that Email/Password authentication is enabled in your Firebase console.";
      } else if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email address.";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Incorrect password.";
      } else if (error.code === "auth/email-already-in-use") {
        errorMessage = "An account with this email already exists.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password should be at least 6 characters.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              {mode === "login" && "Welcome to InvoicePro"}
              {mode === "register" && "Create Your Account"}
              {mode === "reset" && "Reset Password"}
            </h2>
            <p className="text-slate-600 mt-2">
              {mode === "login" && "Sign in to manage your invoices"}
              {mode === "register" && "Get started with professional invoicing"}
              {mode === "reset" && "Enter your email to reset your password"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="john@company.com"
                required
              />
            </div>

            {mode !== "reset" && (
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  placeholder="••••••••"
                  required
                />
              </div>
            )}

            {mode === "register" && (
              <>
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      handleInputChange("confirmPassword", e.target.value)
                    }
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    type="text"
                    value={formData.businessName}
                    onChange={(e) =>
                      handleInputChange("businessName", e.target.value)
                    }
                    placeholder="Your Business Name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  <Input
                    id="contactPerson"
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) =>
                      handleInputChange("contactPerson", e.target.value)
                    }
                    placeholder="Your Full Name"
                    required
                  />
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Loading..."
                : mode === "login"
                ? "Sign In"
                : mode === "register"
                ? "Create Account"
                : "Send Reset Email"}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {mode === "login" && (
              <>
                <p className="text-slate-600">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("register")}
                    className="text-primary hover:text-primary/80 font-medium"
                  >
                    Sign up
                  </button>
                </p>
                <button
                  type="button"
                  onClick={() => setMode("reset")}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Forgot your password?
                </button>
              </>
            )}
            {mode === "register" && (
              <p className="text-slate-600">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-primary hover:text-primary/80 font-medium"
                >
                  Sign in
                </button>
              </p>
            )}
            {mode === "reset" && (
              <p className="text-slate-600">
                Remember your password?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-primary hover:text-primary/80 font-medium"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
