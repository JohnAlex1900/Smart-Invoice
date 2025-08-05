import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  FileText,
  Clock,
  Users,
  DollarSign,
  PlusCircle,
  UserPlus,
  BarChart,
  ArrowRight,
} from "lucide-react";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { getAuthHeaders } = useAuth();

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/dashboard/metrics", { headers });
      if (!response.ok) throw new Error("Failed to fetch metrics");
      return response.json();
    },
  });

  const { data: recentInvoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/dashboard/recent-invoices"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/dashboard/recent-invoices?limit=5", {
        headers,
      });
      if (!response.ok) throw new Error("Failed to fetch recent invoices");
      return response.json();
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

  if (metricsLoading || invoicesLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const invoiceChange = metrics?.prevMonthInvoices
    ? (
        ((metrics.totalInvoices - metrics.prevMonthInvoices) /
          metrics.prevMonthInvoices) *
        100
      ).toFixed(1)
    : "N/A";

  const revenueChange = metrics?.prevMonthRevenue
    ? (
        ((parseFloat(metrics.totalRevenue) -
          parseFloat(metrics.prevMonthRevenue)) /
          parseFloat(metrics.prevMonthRevenue)) *
        100
      ).toFixed(1)
    : "N/A";

  const clientChange = metrics?.prevMonthClients
    ? metrics.totalClients - metrics.prevMonthClients
    : "N/A";

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-2">
          Overview of your invoicing activity
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Invoices
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-2">
                  {metrics?.totalInvoices || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-green-500 text-sm font-medium">
                {invoiceChange !== "N/A" ? `+${invoiceChange}%` : "N/A"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Pending Payments
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-2">
                  {formatCurrency(metrics?.pendingAmount || "0")}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-yellow-500 text-sm font-medium">
                {recentInvoices?.filter((inv: any) => inv.status === "pending")
                  .length || 0}{" "}
                invoices
              </span>
              <span className="text-slate-500 text-sm ml-2">
                awaiting payment
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Clients
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-2">
                  {metrics?.totalClients || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-green-500 text-sm font-medium">
                {clientChange !== "N/A" ? `+${clientChange}%` : "N/A"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Revenue</p>
                <p className="text-2xl font-bold text-slate-900 mt-2">
                  {formatCurrency(metrics?.totalRevenue || "0")}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-green-500 text-sm font-medium">
                {revenueChange !== "N/A" ? `+${revenueChange}%` : "N/A"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">
              Recent Invoices
            </h3>
          </div>

          <CardContent className="p-6">
            {!recentInvoices || recentInvoices.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No invoices yet</p>
                <Button
                  onClick={() => setLocation("/invoices/create")}
                  className="mt-4"
                >
                  Create Your First Invoice
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentInvoices.map((invoice: any) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {invoice.invoiceNumber}
                      </p>
                      <p className="text-sm text-slate-600">
                        {invoice.client.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-900">
                        {formatCurrency(invoice.total, invoice.currency)}
                      </p>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          invoice.status
                        )}`}
                      >
                        {invoice.status.charAt(0).toUpperCase() +
                          invoice.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">
              Quick Actions
            </h3>
          </div>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Button
                onClick={() => setLocation("/invoices/create")}
                className="w-full flex items-center justify-between p-4 h-auto bg-primary/10 text-primary hover:bg-primary/20 border-0"
                variant="outline"
              >
                <div className="flex items-center space-x-3">
                  <PlusCircle className="w-5 h-5" />
                  <span className="font-medium">Create New Invoice</span>
                </div>
                <ArrowRight className="w-4 h-4" />
              </Button>

              <Button
                onClick={() => setLocation("/clients")}
                className="w-full flex items-center justify-between p-4 h-auto"
                variant="outline"
              >
                <div className="flex items-center space-x-3">
                  <UserPlus className="w-5 h-5" />
                  <span className="font-medium">Add New Client</span>
                </div>
                <ArrowRight className="w-4 h-4" />
              </Button>

              <Button
                onClick={() => setLocation("/invoices")}
                className="w-full flex items-center justify-between p-4 h-auto"
                variant="outline"
              >
                <div className="flex items-center space-x-3">
                  <BarChart className="w-5 h-5" />
                  <span className="font-medium">View Reports</span>
                </div>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
