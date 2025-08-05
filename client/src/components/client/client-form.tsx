import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { z } from "zod";

const clientFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
});

interface ClientFormProps {
  client?: any;
  onSuccess?: () => void;
}

export default function ClientForm({ client, onSuccess }: ClientFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<z.infer<typeof clientFormSchema>>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: client?.name || "",
      email: client?.email || "",
      phone: client?.phone || "",
      address: client?.address || "",
    },
  });

  const createClientMutation = useMutation({
    mutationFn: async (clientData: z.infer<typeof clientFormSchema>) => {
      const url = client ? `/api/clients/${client.id}` : "/api/clients";
      const method = client ? "PUT" : "POST";

      return apiRequest(method, url, clientData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Success",
        description: client
          ? "Client updated successfully."
          : "Client created successfully.",
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof clientFormSchema>) => {
    createClientMutation.mutate(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Company Name *</Label>
        <Input
          id="name"
          {...form.register("name")}
          placeholder="Acme Corporation"
        />
        {form.formState.errors.name && (
          <p className="text-sm text-red-600 mt-1">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="email">Email Address *</Label>
        <Input
          id="email"
          type="email"
          {...form.register("email")}
          placeholder="contact@acme.com"
        />
        {form.formState.errors.email && (
          <p className="text-sm text-red-600 mt-1">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          type="tel"
          {...form.register("phone")}
          placeholder="+1 (555) 123-4567"
        />
        {form.formState.errors.phone && (
          <p className="text-sm text-red-600 mt-1">
            {form.formState.errors.phone.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          {...form.register("address")}
          placeholder="123 Business St, Suite 100, New York, NY 10001"
          rows={3}
        />
        {form.formState.errors.address && (
          <p className="text-sm text-red-600 mt-1">
            {form.formState.errors.address.message}
          </p>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="submit" disabled={createClientMutation.isPending}>
          {createClientMutation.isPending
            ? "Saving..."
            : client
            ? "Update Client"
            : "Create Client"}
        </Button>
      </div>
    </form>
  );
}
