import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export default function CreateInvoice() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { getAuthHeaders, user } = useAuth();
  
  const [formData, setFormData] = useState({
    clientId: "",
    currency: user?.defaultCurrency || "USD",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    taxRate: user?.defaultTaxRate || "0",
    notes: "",
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", quantity: 1, rate: 0, amount: 0 }
  ]);

  // Calculate due date based on payment terms
  useEffect(() => {
    if (formData.invoiceDate && user?.defaultPaymentTerms) {
      const invoiceDate = new Date(formData.invoiceDate);
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + user.defaultPaymentTerms);
      setFormData(prev => ({
        ...prev,
        dueDate: dueDate.toISOString().split("T")[0]
      }));
    }
  }, [formData.invoiceDate, user?.defaultPaymentTerms]);

  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const response = await fetch("/api/clients", {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch clients");
      return response.json();
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: any) => {
      return apiRequest("POST", "/api/invoices", invoiceData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Success",
        description: "Invoice created successfully.",
      });
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

  const generateInvoiceNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `INV-${timestamp}`;
  };

  const calculateItemAmount = (quantity: number, rate: number) => {
    return quantity * rate;
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === "quantity" || field === "rate") {
      newItems[index].amount = calculateItemAmount(
        newItems[index].quantity,
        newItems[index].rate
      );
    }
    
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, rate: 0, amount: 0 }]);
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
    
    if (!formData.clientId) {
      toast({
        title: "Error",
        description: "Please select a client.",
        variant: "destructive",
      });
      return;
    }

    if (items.some(item => !item.description.trim())) {
      toast({
        title: "Error",
        description: "Please fill in all item descriptions.",
        variant: "destructive",
      });
      return;
    }

    const { subtotal, taxAmount, total } = calculateTotals();
    
    const invoiceData = {
      ...formData,
      invoiceNumber: generateInvoiceNumber(),
      subtotal: subtotal.toFixed(2),
      taxRate: formData.taxRate,
      taxAmount: taxAmount.toFixed(2),
      total: total.toFixed(2),
      invoiceDate: formData.invoiceDate, // Send as string, let server handle conversion
      dueDate: formData.dueDate, // Send as string, let server handle conversion
      items: items.map(item => ({
        description: item.description,
        quantity: item.quantity.toFixed(2),
        rate: item.rate.toFixed(2),
        amount: item.amount.toFixed(2),
      })),
    };

    console.log("Sending invoice data:", invoiceData);
    createInvoiceMutation.mutate(invoiceData);
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
            <h1 className="text-3xl font-bold text-slate-900">Create Invoice</h1>
            <p className="text-slate-600 mt-2">Fill in the details to create a new invoice</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Invoice Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Invoice Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="invoiceNumber">Invoice Number</Label>
                    <Input
                      id="invoiceNumber"
                      value={generateInvoiceNumber()}
                      className="bg-slate-50"
                      readOnly
                    />
                  </div>
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
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
                    <Label htmlFor="invoiceDate">Invoice Date</Label>
                    <Input
                      id="invoiceDate"
                      type="date"
                      value={formData.invoiceDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, invoiceDate: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client Selection */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Client Information</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation("/clients")}
                  >
                    + Add New Client
                  </Button>
                </div>
                <div>
                  <Label htmlFor="client">Select Client</Label>
                  <Select
                    value={formData.clientId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, clientId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientsLoading ? (
                        <SelectItem value="loading" disabled>Loading clients...</SelectItem>
                      ) : (
                        clients?.map((client: any) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Items */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Invoice Items</h3>
                  <Button type="button" onClick={addItem} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-4 p-4 bg-slate-50 rounded-lg">
                      <div className="col-span-5">
                        <Label>Description</Label>
                        <Input
                          placeholder="Item description"
                          value={item.description}
                          onChange={(e) => updateItem(index, "description", e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Rate</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => updateItem(index, "rate", parseFloat(e.target.value) || 0)}
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Amount</Label>
                        <Input
                          value={formatCurrency(item.amount)}
                          className="bg-slate-100"
                          readOnly
                        />
                      </div>
                      <div className="col-span-1 flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                          className="text-red-600 hover:text-red-700"
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
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Additional Notes</h3>
                <Textarea
                  placeholder="Add any additional notes or terms..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>

          {/* Invoice Summary */}
          <div className="space-y-6">
            <Card className="sticky top-8">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Invoice Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-600">Tax</span>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.taxRate}
                        onChange={(e) => setFormData(prev => ({ ...prev, taxRate: e.target.value }))}
                        className="w-16 h-6 text-xs"
                      />
                      <span className="text-slate-600">%</span>
                    </div>
                    <span className="font-medium">{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-3">
                    <div className="flex justify-between">
                      <span className="text-lg font-semibold text-slate-900">Total</span>
                      <span className="text-lg font-bold text-slate-900">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={createInvoiceMutation.isPending}
                  >
                    {createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
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
