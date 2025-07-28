import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Download, 
  Trash2,
  FileText 
} from "lucide-react";

export default function Invoices() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { getAuthHeaders } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["/api/invoices", { status: statusFilter, search }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (search) params.append("search", search);
      
      const response = await fetch(`/api/invoices?${params}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch invoices");
      return response.json();
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      return apiRequest("DELETE", `/api/invoices/${invoiceId}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Invoice deleted successfully.",
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

  const updateStatusMutation = useMutation({
    mutationFn: async ({ invoiceId, status }: { invoiceId: string; status: string }) => {
      return apiRequest("PATCH", `/api/invoices/${invoiceId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Success",
        description: "Invoice status updated successfully.",
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const formatCurrency = (amount: string, currency = "USD") => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    if (window.confirm("Are you sure you want to delete this invoice?")) {
      deleteInvoiceMutation.mutate(invoiceId);
    }
  };

  const handleMarkAsPaid = (invoiceId: string) => {
    updateStatusMutation.mutate({ invoiceId, status: "paid" });
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-32 bg-slate-200 rounded-xl"></div>
          <div className="h-96 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-600 mt-2">Manage and track your invoices</p>
        </div>
        <Button onClick={() => setLocation("/invoices/create")}>
          <Plus className="w-5 h-5 mr-2" />
          Create Invoice
        </Button>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <Input
                  placeholder="Search invoices..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <div className="overflow-x-auto">
          {!invoices || invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No invoices found</h3>
              <p className="text-slate-500 mb-6">
                {search || statusFilter !== "all" 
                  ? "Try adjusting your search or filters" 
                  : "Get started by creating your first invoice"}
              </p>
              <Button onClick={() => setLocation("/invoices/create")}>
                <Plus className="w-5 h-5 mr-2" />
                Create Invoice
              </Button>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-4 px-6 font-medium text-slate-900">Invoice #</th>
                  <th className="text-left py-4 px-6 font-medium text-slate-900">Client</th>
                  <th className="text-left py-4 px-6 font-medium text-slate-900">Amount</th>
                  <th className="text-left py-4 px-6 font-medium text-slate-900">Date</th>
                  <th className="text-left py-4 px-6 font-medium text-slate-900">Due Date</th>
                  <th className="text-left py-4 px-6 font-medium text-slate-900">Status</th>
                  <th className="text-left py-4 px-6 font-medium text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoices.map((invoice: any) => (
                  <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-medium text-slate-900">{invoice.invoiceNumber}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-medium text-slate-900">{invoice.client.name}</p>
                        <p className="text-sm text-slate-500">{invoice.client.email}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-medium text-slate-900">
                        {formatCurrency(invoice.total, invoice.currency)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-slate-600">{formatDate(invoice.invoiceDate)}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-slate-600">{formatDate(invoice.dueDate)}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="ghost" title="View">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Edit">
                          <Edit className="w-4 h-4" />
                        </Button>
                        {invoice.status === "pending" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMarkAsPaid(invoice.id)}
                            className="text-green-600 hover:text-green-700"
                            title="Mark as Paid"
                          >
                            ✓
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" title="Download PDF">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteInvoice(invoice.id)}
                          className="text-red-600 hover:text-red-700"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
