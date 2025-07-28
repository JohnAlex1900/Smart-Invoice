import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { z } from "zod";

const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  rate: z.number().min(0, "Rate must be greater than or equal to 0"),
  amount: z.number(),
});

const invoiceFormSchema = z.object({
  clientId: z.string().min(1, "Please select a client"),
  currency: z.enum(["USD", "KES"]),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  taxRate: z.string(),
  notes: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
});

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceFormProps {
  invoice?: any;
  onSubmit: (data: InvoiceFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export default function InvoiceForm({ invoice, onSubmit, onCancel, isLoading }: InvoiceFormProps) {
  const { user, getAuthHeaders } = useAuth();
  
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", quantity: 1, rate: 0, amount: 0 }
  ]);

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      clientId: invoice?.clientId || "",
      currency: invoice?.currency || user?.defaultCurrency || "USD",
      invoiceDate: invoice?.invoiceDate 
        ? new Date(invoice.invoiceDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      dueDate: invoice?.dueDate 
        ? new Date(invoice.dueDate).toISOString().split("T")[0]
        : "",
      taxRate: invoice?.taxRate || user?.defaultTaxRate || "0",
      notes: invoice?.notes || "",
      items: items,
    },
  });

  // Initialize items from invoice if editing
  useEffect(() => {
    if (invoice?.items && invoice.items.length > 0) {
      const invoiceItems = invoice.items.map((item: any) => ({
        description: item.description,
        quantity: parseFloat(item.quantity),
        rate: parseFloat(item.rate),
        amount: parseFloat(item.amount),
      }));
      setItems(invoiceItems);
      form.setValue("items", invoiceItems);
    }
  }, [invoice, form]);

  // Calculate due date based on payment terms
  useEffect(() => {
    const invoiceDate = form.watch("invoiceDate");
    if (invoiceDate && user?.defaultPaymentTerms && !invoice) {
      const date = new Date(invoiceDate);
      const dueDate = new Date(date);
      dueDate.setDate(dueDate.getDate() + user.defaultPaymentTerms);
      form.setValue("dueDate", dueDate.toISOString().split("T")[0]);
    }
  }, [form.watch("invoiceDate"), user?.defaultPaymentTerms, invoice, form]);

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
    form.setValue("items", newItems);
  };

  const addItem = () => {
    const newItems = [...items, { description: "", quantity: 1, rate: 0, amount: 0 }];
    setItems(newItems);
    form.setValue("items", newItems);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
      form.setValue("items", newItems);
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxRate = parseFloat(form.watch("taxRate")) / 100;
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;
    
    return { subtotal, taxAmount, total };
  };

  const handleSubmit = (data: InvoiceFormData) => {
    const { subtotal, taxAmount, total } = calculateTotals();
    
    const submissionData = {
      ...data,
      invoiceNumber: invoice?.invoiceNumber || generateInvoiceNumber(),
      subtotal: subtotal.toString(),
      taxAmount: taxAmount.toString(),
      total: total.toString(),
      invoiceDate: new Date(data.invoiceDate).toISOString(),
      dueDate: new Date(data.dueDate).toISOString(),
      items: items.map(item => ({
        description: item.description,
        quantity: item.quantity.toString(),
        rate: item.rate.toString(),
        amount: item.amount.toString(),
      })),
    };

    onSubmit(submissionData as any);
  };

  const { subtotal, taxAmount, total } = calculateTotals();
  const currency = form.watch("currency");

  const formatCurrency = (amount: number, curr = currency) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: curr,
    }).format(amount);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
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
                    value={invoice?.invoiceNumber || generateInvoiceNumber()}
                    className="bg-slate-50"
                    readOnly
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={form.watch("currency")}
                    onValueChange={(value) => form.setValue("currency", value as "USD" | "KES")}
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
                    {...form.register("invoiceDate")}
                  />
                  {form.formState.errors.invoiceDate && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.invoiceDate.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    {...form.register("dueDate")}
                  />
                  {form.formState.errors.dueDate && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.dueDate.message}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Selection */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Client Information</h3>
              </div>
              <div>
                <Label htmlFor="client">Select Client</Label>
                <Select
                  value={form.watch("clientId")}
                  onValueChange={(value) => form.setValue("clientId", value)}
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
                {form.formState.errors.clientId && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.clientId.message}
                  </p>
                )}
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
              {form.formState.errors.items && (
                <p className="text-sm text-red-600 mt-2">
                  {form.formState.errors.items.message}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Additional Notes</h3>
              <Textarea
                placeholder="Add any additional notes or terms..."
                {...form.register("notes")}
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
                      {...form.register("taxRate")}
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
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : invoice ? "Update Invoice" : "Create Invoice"}
                </Button>
                {onCancel && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full"
                    onClick={onCancel}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
