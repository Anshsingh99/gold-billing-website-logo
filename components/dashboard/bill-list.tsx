"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { generateBillPDF } from "@/lib/pdf-generator";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface Bill {
  id: string;
  bill_number: string;
  customer_id: string;
  bill_date: string;
  total_amount: number;
  status: string;
  whatsapp_sent: boolean;
  payment_status?: string;
  paid_amount?: number;
  remaining_amount?: number;
  customers?: {
    name: string;
    phone: string;
  };
  bill_items?: any[];
}

export default function BillList({
  bills,
  onEdit,
  onRefresh,
}: {
  bills: Bill[];
  onEdit: (bill: Bill) => void;
  onRefresh: () => void;
}) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [whatsappSendingId, setWhatsappSendingId] = useState<string | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { toast } = useToast();

  // Filter and search bills
  const filteredBills = useMemo(() => {
    return bills.filter((bill) => {
      const matchesSearch =
        bill.bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.customers?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        new Date(bill.bill_date).toLocaleDateString().includes(searchTerm);

      const matchesFilter =
        filterStatus === "all" || bill.payment_status === filterStatus;

      return matchesSearch && matchesFilter;
    });
  }, [bills, searchTerm, filterStatus]);

  const handleDownloadPDF = async (bill: Bill) => {
    setDownloadingId(bill.id);
    try {
      await generateBillPDF(bill);
      toast({
        title: "Success",
        description: "Bill downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to download bill",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSendWhatsApp = async (bill: Bill) => {
    if (!bill.customers?.phone) {
      toast({
        title: "Error",
        description: "Customer phone number not found",
        variant: "destructive",
      });
      return;
    }

    setWhatsappSendingId(bill.id);
    try {
      // Get shop profile for name
      const supabase = createClient();
      const { data: shopData } = await supabase
        .from("shop_profile")
        .select("shop_name")
        .single();

      const response = await fetch("/api/send-whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerPhone: bill.customers.phone,
          customerName: bill.customers.name,
          billNumber: bill.bill_number,
          totalAmount: bill.total_amount,
          remainingAmount: bill.remaining_amount,
          shopName: shopData?.shop_name || "Gold Billing",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate WhatsApp link");
      }

      const data = await response.json();

      // Update bill status
      await supabase
        .from("bills")
        .update({ whatsapp_sent: true })
        .eq("id", bill.id);

      // Open WhatsApp link in new window
      window.open(data.whatsappLink, "_blank");

      toast({
        title: "Success",
        description: "WhatsApp opened with bill message",
      });
      onRefresh();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to send WhatsApp",
        variant: "destructive",
      });
    } finally {
      setWhatsappSendingId(null);
    }
  };

  const handleDelete = async (billId: string) => {
    if (!confirm("Are you sure you want to delete this bill?")) return;

    try {
      const supabase = createClient();
      const { error } = await supabase.from("bills").delete().eq("id", billId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Bill deleted",
      });
      onRefresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete bill",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader>
        <CardTitle className="text-sm sm:text-base text-amber-900 dark:text-amber-300">
          Your Bills
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          View and manage all your bills
        </CardDescription>
      </CardHeader>
      <CardContent>
        {bills.length > 0 && (
          <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
            {/* Search Bar */}
            <div>
              <Input
                type="text"
                placeholder="Search by Bill ID, Customer, or Date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-amber-200 dark:border-amber-800 text-xs sm:text-sm"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={filterStatus === "all" ? "default" : "outline"}
                onClick={() => setFilterStatus("all")}
                className={`text-xs sm:text-sm ${
                  filterStatus === "all"
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400"
                }`}
              >
                All Bills
              </Button>
              <Button
                size="sm"
                variant={filterStatus === "paid" ? "default" : "outline"}
                onClick={() => setFilterStatus("paid")}
                className={`text-xs sm:text-sm ${
                  filterStatus === "paid"
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "border-amber-200 dark:border-amber-800"
                }`}
              >
                Paid
              </Button>
              <Button
                size="sm"
                variant={filterStatus === "partial" ? "default" : "outline"}
                onClick={() => setFilterStatus("partial")}
                className={`text-xs sm:text-sm ${
                  filterStatus === "partial"
                    ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                    : "border-amber-200 dark:border-amber-800"
                }`}
              >
                Partial
              </Button>
              <Button
                size="sm"
                variant={filterStatus === "unpaid" ? "default" : "outline"}
                onClick={() => setFilterStatus("unpaid")}
                className={`text-xs sm:text-sm ${
                  filterStatus === "unpaid"
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "border-amber-200 dark:border-amber-800"
                }`}
              >
                Unpaid
              </Button>
            </div>

            {/* Results count */}
            <div className="text-xs sm:text-sm text-muted-foreground">
              Showing {filteredBills.length} of {bills.length} bills
            </div>
          </div>
        )}

        {bills.length === 0 ? (
          <div className="text-center py-8 text-xs sm:text-sm text-muted-foreground">
            No bills created yet. Create your first bill to get started.
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="text-center py-8 text-xs sm:text-sm text-muted-foreground">
            No bills match your search or filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-xs sm:text-sm">
              <thead className="border-b border-amber-200 dark:border-amber-800">
                <tr>
                  <th className="text-left py-2 px-2 sm:px-4 font-semibold text-amber-900 dark:text-amber-300">
                    Bill #
                  </th>
                  <th className="text-left py-2 px-2 sm:px-4 font-semibold text-amber-900 dark:text-amber-300 hidden sm:table-cell">
                    Customer
                  </th>
                  <th className="text-left py-2 px-2 sm:px-4 font-semibold text-amber-900 dark:text-amber-300 hidden md:table-cell">
                    Date
                  </th>
                  <th className="text-right py-2 px-2 sm:px-4 font-semibold text-amber-900 dark:text-amber-300">
                    Amount
                  </th>
                  <th className="text-center py-2 px-2 sm:px-4 font-semibold text-amber-900 dark:text-amber-300 hidden sm:table-cell">
                    Status
                  </th>
                  <th className="text-center py-2 px-2 sm:px-4 font-semibold text-amber-900 dark:text-amber-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map((bill) => (
                  <tr
                    key={bill.id}
                    className="border-b border-amber-100 dark:border-amber-900"
                  >
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm">
                      {bill.bill_number}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell">
                      {bill.customers?.name || "Unknown"}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden md:table-cell">
                      {new Date(bill.bill_date).toLocaleDateString()}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-right font-semibold text-xs sm:text-sm">
                      ₹{bill.total_amount.toFixed(0)}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-center hidden sm:table-cell">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          bill.payment_status === "paid"
                            ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100"
                            : bill.payment_status === "partial"
                              ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100"
                              : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100"
                        }`}
                      >
                        {bill.payment_status === "paid"
                          ? "Paid"
                          : bill.payment_status === "partial"
                            ? "Partial"
                            : "Unpaid"}
                      </span>
                    </td>
                    <td className="py-2 sm:py-3 px-1 sm:px-4 text-right">
                      <div className="flex flex-col sm:flex-row gap-1 sm:gap-1">
                        <Button
                          onClick={() => onEdit(bill)}
                          size="xs"
                          variant="outline"
                          className="border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 text-xs px-2"
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleDownloadPDF(bill)}
                          disabled={downloadingId === bill.id}
                          size="xs"
                          className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-2"
                          title={
                            downloadingId === bill.id
                              ? "Downloading..."
                              : "Download PDF"
                          }
                        >
                          {downloadingId === bill.id ? "..." : "PDF"}
                        </Button>
                        <Button
                          onClick={() => handleSendWhatsApp(bill)}
                          disabled={whatsappSendingId === bill.id}
                          size="xs"
                          className="bg-green-600 hover:bg-green-700 text-white text-xs px-2"
                          title={
                            whatsappSendingId === bill.id
                              ? "Sending..."
                              : "Send WhatsApp"
                          }
                        >
                          {whatsappSendingId === bill.id ? "..." : "WA"}
                        </Button>
                        <Button
                          onClick={() => handleDelete(bill.id)}
                          size="xs"
                          variant="outline"
                          className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs px-2 hover:bg-red-50 dark:hover:bg-red-950"
                          title="Delete Bill"
                        >
                          Del
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
