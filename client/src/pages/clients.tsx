import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import ClientForm from "@/components/client/client-form";
import { UserPlus, Search, Building, Edit, Trash2, Users } from "lucide-react";

const baseUrl = "https://smart-invoice-9e36.onrender.com";

export default function Clients() {
  const { toast } = useToast();
  const { getAuthHeaders } = useAuth();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);

  const { data: clients, isLoading } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${baseUrl}/api/clients`, { headers });
      if (!response.ok) throw new Error("Failed to fetch metrics");
      return response.json();
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      return apiRequest(
        "DELETE",
        `${baseUrl}/api/clients/${clientId}`,
        undefined
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Success",
        description: "Client deleted successfully.",
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

  const handleDeleteClient = (clientId: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete this client? This will also delete all associated invoices."
      )
    ) {
      deleteClientMutation.mutate(clientId);
    }
  };

  const handleEditClient = (client: any) => {
    setEditingClient(client);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingClient(null);
  };

  const filteredClients =
    clients?.filter(
      (client: any) =>
        client.name.toLowerCase().includes(search.toLowerCase()) ||
        client.email.toLowerCase().includes(search.toLowerCase())
    ) || [];

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-32 bg-slate-200 rounded-xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-slate-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Clients</h1>
          <p className="text-slate-600 mt-2">
            Manage your client relationships
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-5 h-5 mr-2" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingClient ? "Edit Client" : "Add New Client"}
              </DialogTitle>
            </DialogHeader>
            <ClientForm client={editingClient} onSuccess={handleCloseDialog} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              {search ? "No clients found" : "No clients yet"}
            </h3>
            <p className="text-slate-500 mb-6">
              {search
                ? "Try adjusting your search terms"
                : "Get started by adding your first client"}
            </p>
            {!search && (
              <Button onClick={() => setDialogOpen(true)}>
                <UserPlus className="w-5 h-5 mr-2" />
                Add Client
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client: any) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Building className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditClient(client)}
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteClient(client.id)}
                      className="text-red-600 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    {client.name}
                  </h3>
                  <p className="text-slate-600 mb-1">{client.email}</p>
                  {client.phone && (
                    <p className="text-slate-600 mb-4">{client.phone}</p>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">
                      Invoices:{" "}
                      <span className="font-medium text-slate-900">
                        {client.invoiceCount}
                      </span>
                    </span>
                    <span className="text-slate-500">
                      Total:{" "}
                      <span className="font-medium text-slate-900">
                        {formatCurrency(client.totalAmount)}
                      </span>
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
