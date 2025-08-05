import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, useParams } from "wouter";
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
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import type { InvoiceWithDetails } from "@shared/schema";
import { InvoiceItem as SharedInvoiceItem } from "@shared/schema";

interface InvoiceItem
  extends Omit<SharedInvoiceItem, "quantity" | "rate" | "amount"> {
  quantity: number;
  rate: number;
  amount: number;
}

interface Client {
  id: string;
  name: string;
}

export default function EditInvoice() {
  const [, setLocation] = useLocation();
  const { invoiceId } = useParams();
  const { toast } = useToast();
  const { getAuthHeaders, user } = useAuth();

  const [formData, setFormData] = useState({
    clientId: "",
    currency: "USD",
    invoiceDate: new Date().toISOString().split("T")[0] || "",
    dueDate: "",
    taxRate: "0",
    notes: "",
  });

  const [items, setItems] = useState<InvoiceItem[]>([]);

  const {
    data: invoice,
    isLoading: invoiceLoading,
    error: invoiceError,
  } = useQuery<InvoiceWithDetails, Error>({
    queryKey: ["/api/invoices", invoiceId],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/invoices/${invoiceId}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch invoice");
      return res.json();
    },
  });

  useEffect(() => {
    if (invoice) {
      setFormData({
        clientId: invoice.clientId,
        currency: invoice.currency,
        invoiceDate: invoice.invoiceDate.toString().slice(0, 10),
        dueDate: invoice.dueDate.toString().split("T")[0],
        taxRate: invoice.taxRate,
        notes: invoice.notes ?? "",
      });

      setItems(
        invoice.items.map((item) => ({
          id: item.id,
          invoiceId: item.invoiceId,
          createdAt: item.createdAt,
          description: item.description,
          quantity: parseFloat(item.quantity),
          rate: parseFloat(item.rate),
          amount: parseFloat(item.amount),
        }))
      );
    }
  }, [invoice]);

  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/clients", { headers });
      if (!res.ok) throw new Error("Failed to fetch clients");
      return res.json();
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: any) => {
      return apiRequest("PUT", `/api/invoices/${invoiceId}`, invoiceData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Success", description: "Invoice updated successfully." });
      setLocation("/invoices");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const calculateItemAmount = (quantity: number, rate: number) => {
    return quantity * rate;
  };

  const updateItem = (
    index: number,
    field: keyof InvoiceItem,
    value: string | number
  ) => {
    const newItems = items.map((item, i) => {
      if (i !== index) return item;

      const updatedItem = {
        ...item,
        [field]: value,
      };

      if (field === "quantity" || field === "rate") {
        const quantity = field === "quantity" ? Number(value) : item.quantity;
        const rate = field === "rate" ? Number(value) : item.rate;
        return {
          ...updatedItem,
          amount: calculateItemAmount(quantity, rate),
        };
      }

      return updatedItem;
    });

    setItems(newItems);
  };

  if (!invoiceId) {
    toast({ title: "Error", description: "Missing invoice ID." });
    return;
  }

  const addItem = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(), // or some placeholder
        description: "",
        quantity: 1,
        rate: 0,
        amount: 0,
        invoiceId: invoiceId,
        createdAt: new Date(),
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxRate = parseFloat(formData.taxRate) / 100;
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    return { subtotal, taxAmount, total };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const invoiceDate = formData.invoiceDate
      ? new Date(formData.invoiceDate)
      : null;
    const dueDate = formData.dueDate ? new Date(formData.dueDate) : null;

    if (!invoiceDate || !dueDate) {
      toast({
        title: "Error",
        description: "Invoice Date and Due Date are required.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.clientId) {
      toast({
        title: "Error",
        description: "Please select a client.",
        variant: "destructive",
      });
      return;
    }

    if (items.some((item) => !item.description.trim())) {
      toast({
        title: "Error",
        description: "Please fill in all item descriptions.",
        variant: "destructive",
      });
      return;
    }

    const { subtotal, taxAmount, total } = calculateTotals();

    const invoiceData = {
      invoice: {
        ...formData,
        invoiceDate,
        dueDate,
        subtotal: subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        total: total.toFixed(2),
      },
      items: items.map((item) => ({
        id: item.id,
        invoiceId: item.invoiceId,
        createdAt: item.createdAt,
        description: item.description,
        quantity: item.quantity.toFixed(2),
        rate: item.rate.toFixed(2),
        amount: item.amount.toFixed(2),
      })) as SharedInvoiceItem[],
    };

    if (!formData.invoiceDate || !formData.dueDate) {
      toast({
        title: "Error",
        description: "Invoice Date and Due Date are required.",
        variant: "destructive",
      });
      return;
    }

    updateInvoiceMutation.mutate(invoiceData);
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  const formatCurrency = (amount: number, currency = formData.currency) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  return (
    <div className="p-8">
      {invoiceError && (
        <p className="text-red-600">
          Failed to load invoice: {invoiceError.message}
        </p>
      )}

      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/invoices")}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Edit Invoice</h1>
            <p className="text-slate-600 mt-2">
              Update invoice details and items
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Details */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Invoice Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, currency: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="KES">
                          KES - Kenyan Shilling
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="invoiceDate">Invoice Date</Label>
                    <Input
                      id="invoiceDate"
                      type="date"
                      value={formData.invoiceDate}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          invoiceDate: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          dueDate: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client Selection */}
            <Card>
              <CardContent className="p-6">
                <Label htmlFor="client">Select Client</Label>
                <Select
                  value={formData.clientId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, clientId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientsLoading ? (
                      <SelectItem value="loading" disabled>
                        Loading clients...
                      </SelectItem>
                    ) : (
                      clients?.map((client: any) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Invoice Items */}
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between mb-4">
                  <h3 className="text-lg font-semibold">Invoice Items</h3>
                  <Button type="button" onClick={addItem} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-12 gap-4 bg-slate-50 p-4 rounded-lg"
                    >
                      <div className="col-span-5">
                        <Label>Description</Label>
                        <Input
                          value={item.description}
                          onChange={(e) =>
                            updateItem(index, "description", e.target.value)
                          }
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "quantity",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Rate</Label>
                        <Input
                          type="number"
                          value={item.rate}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "rate",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Amount</Label>
                        <Input
                          value={formatCurrency(item.amount)}
                          readOnly
                          className="bg-slate-100"
                        />
                      </div>
                      <div className="col-span-1 flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-red-600"
                          disabled={items.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardContent className="p-6">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>

          {/* Invoice Summary */}
          <div className="space-y-6">
            <Card className="sticky top-8">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Invoice Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-medium">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-600">Tax</span>
                      <Input
                        type="number"
                        value={formData.taxRate}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            taxRate: e.target.value,
                          }))
                        }
                        className="w-16 h-6 text-xs"
                      />
                      <span className="text-slate-600">%</span>
                    </div>
                    <span className="font-medium">
                      {formatCurrency(taxAmount)}
                    </span>
                  </div>
                  <div className="border-t border-slate-200 pt-3">
                    <div className="flex justify-between">
                      <span className="text-lg font-semibold text-slate-900">
                        Total
                      </span>
                      <span className="text-lg font-bold text-slate-900">
                        {formatCurrency(total)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={updateInvoiceMutation.isPending}
                  >
                    {updateInvoiceMutation.isPending
                      ? "Updating..."
                      : "Update Invoice"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setLocation("/invoices")}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
