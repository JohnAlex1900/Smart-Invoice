import { useEffect, useState, useRef } from "react";
import { useParams } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { InvoiceWithDetails } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const baseUrl = "https://smart-invoice-9e36.onrender.com";

export default function InvoiceDetails() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [invoice, setInvoice] = useState<InvoiceWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiRequest("GET", `${baseUrl}/api/invoices/${invoiceId}`)
      .then((res) => res.json())
      .then((data: InvoiceWithDetails) => setInvoice(data))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  if (loading) return <p className="p-6">Loading...</p>;
  if (!invoice) return <p className="p-6 text-red-600">Invoice not found.</p>;

  const formatCurrency = (amount: number | string) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: invoice.currency || "USD",
    }).format(typeof amount === "string" ? parseFloat(amount) : amount);

  const formatDate = (date: Date) =>
    format(new Date(invoice.invoiceDate), "dd MMM yyyy");

  const { subtotal, taxAmount, total, currency } = invoice;

  const handleDownloadPDF = async () => {
    if (!pdfRef.current) return;

    const canvas = await html2canvas(pdfRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, width, height);
    pdf.save(`invoice-${invoice.invoiceNumber}.pdf`);
  };

  return (
    <div className="p-8 space-y-8">
      {/* Download Button */}
      <div className="flex justify-end">
        <Button onClick={handleDownloadPDF} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </div>

      <div ref={pdfRef} className="space-y-8 bg-white p-6 rounded-md">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Invoice #{invoice.invoiceNumber}
            </h1>
            <Badge variant="outline" className="capitalize">
              {invoice.status}
            </Badge>
          </div>
          <div className="text-right text-sm text-slate-600 space-y-1">
            <p>Issued: {formatDate(invoice.invoiceDate)}</p>
            <p>Due: {formatDate(invoice.dueDate)}</p>
            {invoice.paidAt && <p>Paid: {formatDate(invoice.paidAt)}</p>}
          </div>
        </div>

        {/* Client Info */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-2">Client Information</h2>
            <p className="font-medium text-slate-900">{invoice.client?.name}</p>
            <p className="text-slate-600">{invoice.client?.email}</p>
          </CardContent>
        </Card>

        {/* Invoice Items */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Invoice Items</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left border-b">
                  <tr>
                    <th className="py-2 pr-4">Description</th>
                    <th className="py-2 pr-4">Quantity</th>
                    <th className="py-2 pr-4">Rate</th>
                    <th className="py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{item.description}</td>
                      <td className="py-2 pr-4">{item.quantity}</td>
                      <td className="py-2 pr-4">{formatCurrency(item.rate)}</td>
                      <td className="py-2">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card className="max-w-md">
          <CardContent className="p-6 space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-700">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700">Tax</span>
              <span className="font-medium">{formatCurrency(taxAmount)}</span>
            </div>
            <hr />
            <div className="flex justify-between text-lg font-bold text-slate-900">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
