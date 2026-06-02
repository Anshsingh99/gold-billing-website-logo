import jsPDF from "jspdf";
import { createClient } from "@/lib/supabase/client";

interface Bill {
  id: string;
  bill_number: string;
  bill_date: string;
  total_weight: number;
  making_charge_rate: number;
  making_charge_amount: number;
  gst_rate: number;
  gst_amount: number;
  total_amount: number;
  notes: string;
  payment_status?: string;
  paid_amount?: number;
  remaining_amount?: number;
  payment_method?: string;
  customer_id?: string;
  customers?: {
    name: string;
    phone: string;
    address: string;
  };
  bill_items?: any[];
}

function formatMoney(value: number) {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

async function fetchLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch("/logo.png");

    if (!res.ok) return null;

    const blob = await res.blob();

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result as string);

      reader.onerror = reject;

      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function amountToWords(amount: number) {
  const words = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function convert(n: number): string {
    if (n < 20) return words[n];

    if (n < 100)
      return (
        tens[Math.floor(n / 10)] +
        (n % 10 ? " " + words[n % 10] : "")
      );

    if (n < 1000)
      return (
        words[Math.floor(n / 100)] +
        " Hundred " +
        convert(n % 100)
      );

    if (n < 100000)
      return (
        convert(Math.floor(n / 1000)) +
        " Thousand " +
        convert(n % 1000)
      );

    if (n < 10000000)
      return (
        convert(Math.floor(n / 100000)) +
        " Lakh " +
        convert(n % 100000)
      );

    return (
      convert(Math.floor(n / 10000000)) +
      " Crore " +
      convert(n % 10000000)
    );
  }

  return convert(Math.floor(amount)) + " Rupees Only";
}

export async function generateBillPDF(bill: Bill) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not found");

  const { data: shopProfile } = await supabase
    .from("shop_profile")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const { data: billItems } = await supabase
    .from("bill_items")
    .select(`
      *,
      products(
        name,
        gold_purity
      )
    `)
    .eq("bill_id", bill.id);

    const {data : customers} = await supabase
    .from("customers")
    .select("*")
    .eq("id", bill.customer_id)
    .single();

  const logoBase64 = await fetchLogoBase64();

  const pdf = new jsPDF({
    unit: "mm",
    format: "a4",
  });

  const PW = pdf.internal.pageSize.getWidth();
  const PH = pdf.internal.pageSize.getHeight();

  const NAVY: [number, number, number] = [8, 32, 86];
  const GOLD: [number, number, number] = [184, 134, 11];
  const BLACK: [number, number, number] = [20, 20, 20];
  const GRAY: [number, number, number] = [120, 120, 120];
  const LIGHT: [number, number, number] = [245, 245, 245];
  const WHITE: [number, number, number] = [255, 255, 255];

  pdf.setFillColor(...WHITE);
  pdf.rect(0, 0, PW, PH, "F");

  let y = 15;

  const items =
    (billItems && billItems.length > 0
      ? billItems
      : bill.bill_items) || [];
      // Adjusted code snippets for better formatting

/// HEADER SECTION

if (logoBase64) {
  const imgFormat = logoBase64.startsWith("data:image/png") ? "PNG" : "JPEG";
  // Move logo slightly left by decreasing x position from 12 to 8
  pdf.addImage(logoBase64, imgFormat, 8, 10, 32, 27);
}

// Title and Subtitle
pdf.setTextColor(...NAVY);
pdf.setFont("times", "bold");
pdf.setFontSize(20);
pdf.text(
  (shopProfile?.shop_name || "SETH BAIJNATH YOGENDRA KUMAR SARRAF").toUpperCase(),
  PW / 2 + 12,
  20,
  { align: "center" }
);

pdf.setFontSize(12);
pdf.setFont("times", "normal");
pdf.text("JEWELLERS SINCE 1950", PW / 2 + 12, 27, { align: "center" });

// Decorative lines - connect them seamlessly
pdf.setDrawColor(...GOLD);
pdf.setLineWidth(0.4);
// Adjust line positions to connect directly
// Connect the lines by making their start and end points align
pdf.line(55, 30, 90, 30); // Left line
pdf.line(90, 30, 120, 30); // Connects from end of first to start of second
pdf.line(120, 30, 155, 30); // Right line
// ===============================
// BILL TO SECTION
// ===============================

y = 50;
pdf.setTextColor(...BLACK);
pdf.setFontSize(11);
pdf.setFont("times", "bold");
pdf.text("Bill To,", 14, y);

pdf.setFontSize(14);
pdf.setFont("times", "normal");
pdf.text(bill.customers?.name || "-", 14, y + 10);

pdf.setFontSize(11);
let customerY = y +17;
if (customers?.address) {
  const addressLines = pdf.splitTextToSize(customers.address, 90);
  pdf.text(addressLines, 14, customerY);
  customerY += addressLines.length * 5;
}
pdf.text(`Phone: ${bill.customers?.phone || "-"}`, 14, customerY + 2);
console.log(bill.customers?.address)

// ===============================
// INVOICE DETAILS RIGHT SIDE
// ===============================

const rightX = 135;
pdf.setFont("times", "bold");
pdf.setFontSize(11);
pdf.text("Invoice No.", rightX, y);
pdf.setFont("times", "normal");
pdf.text(bill.bill_number, rightX + 30, y);
pdf.setFont("times", "bold");
pdf.text("Date", rightX, y + 10);
pdf.setFont("times", "normal");
pdf.text(new Date(bill.bill_date).toLocaleDateString("en-IN"), rightX + 30, y + 10);

pdf.setFont("times", "bold");
pdf.text("Sales Executive", rightX, y + 38);
pdf.setFont("times", "normal");
pdf.text(shopProfile?.owner_name || "-", rightX + 30, y + 38);

// ===============================
// START TABLE POSITION
// ===============================

y = 84;
// ===============================
// PRODUCT TABLE HEADER
// ===============================

const tableX = 14;
const tableWidth = PW - 28;

const colSr = 12;
const colProduct = 72;
const colQty = 18;
const colWeight = 28;
const colRate = 28;
const colAmount = tableWidth - (colSr + colProduct + colQty + colWeight + colRate);

pdf.setFillColor(...NAVY);
pdf.rect(tableX, y, tableWidth, 10, "F");

pdf.setTextColor(255, 255, 255);
pdf.setFont("helvetica", "bold");
pdf.setFontSize(10);
pdf.text("Sr", tableX + 4, y + 6.5);
pdf.text("Product Details", tableX + colSr + 3, y + 6.5);
pdf.text("Qty", tableX + colSr + colProduct + 4, y + 6.5);
pdf.text("Weight", tableX + colSr + colProduct + colQty + 3, y + 6.5);
pdf.text("Rate", tableX + colSr + colProduct + colQty + colWeight + 3, y + 6.5);
pdf.text("Amount", tableX + tableWidth - 5, y + 6.5, { align: "right" });

y += 10;

// ===============================
// TABLE ROWS
// ===============================

let subtotal = 0;
let totalWeight = 0;

items.forEach((item, index) => {
  const rowHeight = 9;
  const rowColor: [number, number, number] = index % 2 === 0 ? [255, 255, 255] : [248, 248, 248];

  pdf.setFillColor(...rowColor);
  pdf.rect(tableX, y, tableWidth, rowHeight, "F");

  const productName = item.products?.name || item.product_name || "Gold Item";
  const purity = item.products?.gold_purity || "";
  const productLabel = purity ? `${productName} (${purity})` : productName;

  const qty = item.quantity || 0;
  const weight = item.weight || 0;
  const rate = item.rate || 0;
  const amount = item.amount || 0;

  subtotal += amount;
  totalWeight += weight;

  pdf.setTextColor(...BLACK);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);

  pdf.text(String(index + 1), tableX + 4, y + 6);
  pdf.text(productLabel, tableX + colSr + 3, y + 6);
  pdf.text(String(qty), tableX + colSr + colProduct + 6, y + 6);
  pdf.text(weight.toFixed(3), tableX + colSr + colProduct + colQty + 4, y + 6);
  pdf.text(formatMoney(rate), tableX + colSr + colProduct + colQty + colWeight + 3, y + 6);
  pdf.text(formatMoney(amount), tableX + tableWidth - 4, y + 6, { align: "right" });

  // separator line
  pdf.setDrawColor(225, 225, 225);
  pdf.line(tableX, y + rowHeight, tableX + tableWidth, y + rowHeight);

  y += rowHeight;
});

// ===============================
// TOTAL WEIGHT ROW
// ===============================

pdf.setFillColor(248, 248, 248);
pdf.rect(tableX, y, tableWidth, 9, "F");
pdf.setFont("helvetica", "bold");
pdf.setTextColor(...NAVY);
pdf.text("Total Weight", tableX + 4, y + 6);
pdf.text(`${totalWeight.toFixed(3)} gm`, tableX + tableWidth - 5, y + 6, { align: "right" });
y += 16;

// ===============================
// AMOUNT IN WORDS SECTION
// ===============================

pdf.setFont("helvetica", "bold");
pdf.setFontSize(10);
pdf.setTextColor(...NAVY);
pdf.text("Amount In Words: ", 14, y);
pdf.setFont("helvetica", "normal");
pdf.setTextColor(...BLACK);
const words = amountToWords(bill.total_amount || 0);
const wordLines = pdf.splitTextToSize(words, 100);
pdf.text(wordLines, y-99, y );
y += wordLines.length * 5 + 7;

/// ===============================
// CUSTOMER / SHOP BOXES
// ===============================

const infoBoxY = y + 2;

pdf.setFillColor(250, 250, 250);

// Customer Details
pdf.roundedRect(14, infoBoxY, 90, 40, 2, 2, "F");
pdf.setDrawColor(220, 220, 220);
pdf.roundedRect(14, infoBoxY, 90, 40, 2, 2, "S");

pdf.setTextColor(...NAVY);
pdf.setFont("helvetica", "bold");
pdf.setFontSize(10);
pdf.text("Customer Details", 18, infoBoxY + 8);

pdf.setFont("helvetica", "normal");
pdf.setTextColor(...BLACK);
pdf.setFontSize(9);

pdf.text(`Name : ${bill.customers?.name || "-"}`, 18, infoBoxY + 16);
pdf.text(`Phone : ${bill.customers?.phone || "-"}`, 18, infoBoxY + 24);
pdf.text(`Payment Mode : ${bill.payment_method || "Cash"}`, 18, infoBoxY + 32);

// Shop Information
pdf.setFillColor(250, 250, 250);
pdf.roundedRect(110, infoBoxY, 86, 40, 2, 2, "F");
pdf.roundedRect(110, infoBoxY, 86, 40, 2, 2, "S");

pdf.setTextColor(...NAVY);
pdf.setFont("helvetica", "bold");
pdf.text("Shop Information", 114, infoBoxY + 8);

pdf.setFont("helvetica", "normal");
pdf.setTextColor(...BLACK);

pdf.text(`Owner : ${shopProfile?.owner_name || "-"}`, 114, infoBoxY + 16);
pdf.text(`Phone : ${shopProfile?.phone || "-"}`, 114, infoBoxY + 24);
pdf.text(`GST No : ${shopProfile?.gst_number || "-"}`, 114, infoBoxY + 32);

// ====================================================
// PAYMENT SUMMARY (LEFT SIDE BELOW CUSTOMER DETAILS)
// ====================================================

const paymentSummaryX = 14;
const paymentSummaryY = infoBoxY + 44;

pdf.setFillColor(248, 248, 248);

pdf.roundedRect(
  paymentSummaryX,
  paymentSummaryY,
  90,
  32,
  2,
  2,
  "F"
);

pdf.setDrawColor(220, 220, 220);

pdf.roundedRect(
  paymentSummaryX,
  paymentSummaryY,
  90,
  32,
  2,
  2,
  "S"
);

pdf.setFont("helvetica", "bold");
pdf.setFontSize(10);
pdf.setTextColor(...NAVY);

pdf.text(
  "Payment Summary",
  paymentSummaryX + 4,
  paymentSummaryY + 8
);

const status = bill.payment_status || "unpaid";

let statusColor: [number, number, number] =
  status === "paid"
    ? [22, 163, 74]
    : status === "partial"
    ? [217, 119, 6]
    : [220, 38, 38];

pdf.setTextColor(...statusColor);

pdf.text(
  status.toUpperCase(),
  paymentSummaryX + 86,
  paymentSummaryY + 8,
  { align: "right" }
);

// FIXED NUMBER SPACING
pdf.setCharSpace(0);
pdf.setFont("helvetica", "normal");
pdf.setFontSize(9);
pdf.setTextColor(...BLACK);

pdf.text(
  `Paid Amount : ${formatMoney(bill.paid_amount || 0)}`,
  paymentSummaryX + 4,
  paymentSummaryY + 18
);

pdf.text(
  `Balance : ${formatMoney(bill.remaining_amount || 0)}`,
  paymentSummaryX + 4,
  paymentSummaryY + 27
);

// ====================================================
// TOTALS BOX (RIGHT SIDE BELOW SHOP INFO)
// ====================================================
// ====================================================
// TOTALS BOX (RIGHT SIDE BELOW SHOP INFO)
// ====================================================
const totalsX = 106; // position from the left
let totalsY = infoBoxY + 44; // starting y position for totals

const boxWidth = 90; // width of each total row box
const rowH = 8; // height of each row

// Function to draw each total row
function totalRow(
  label,           // e.g., "Subtotal", "Grand Total"
  value,           // e.g., " 12,9980"
  fill = false,    // fill background with NAVY color
  whiteText = false, // use white text
  bold = false     // bold text
) {
  // Draw background rectangle
  if (fill) {
    pdf.setFillColor(...NAVY);
    pdf.roundedRect(totalsX, totalsY, boxWidth, rowH, 1, 1, "F");
  } else {
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(totalsX, totalsY, boxWidth, rowH, 1, 1, "F");
    pdf.setDrawColor(220, 220, 220);
    pdf.roundedRect(totalsX, totalsY, boxWidth, rowH, 1, 1, "S");
  }

  // Set font
  pdf.setFont("helvetica", bold ? "bold" : "normal");
  pdf.setFontSize(fill ? 9 : 8);
  pdf.setTextColor(...(whiteText ? [255, 255, 255] : BLACK));

  // Draw label
  pdf.text(label, totalsX + 3, totalsY + 5.5);

  // Draw value aligned to right within the box
  pdf.text(value, totalsX + boxWidth - 24, totalsY + 5.5, {
    align: "center",
    maxWidth: 39,
  });

  // Move y position for next row
  totalsY += rowH;
}

// Usage example: drawing the total rows

// Calculate subtotal
const Finalsubtotal = items.reduce(
  (sum, item) => sum + (item.amount || 0),
  0
);

// Subtotal row
totalRow("Subtotal", ` ${formatMoney(Finalsubtotal)}`);

// Making charge row
totalRow(
  `Making Charge (${bill.making_charge_rate}%)`,
  ` ${formatMoney(bill.making_charge_amount || 0)}`
);

// GST row
totalRow(
  `GST (${bill.gst_rate}%)`,
  ` ${formatMoney(bill.gst_amount || 0)}`
);

// Grand total row - emphasized
totalRow(
  "GRAND TOTAL",
  ` ${formatMoney(bill.total_amount || 0)}`,
  true,   // fill background
  true,   // white text
  true    // bold text
);
// ====================================================
// SIGNATURE
// ====================================================

const signatureY = totalsY + 18;

pdf.setDrawColor(...GRAY);

pdf.line(
  135,
  signatureY,
  195,
  signatureY
);

pdf.setFont("helvetica", "bold");
pdf.setFontSize(10);
pdf.setTextColor(...BLACK);

pdf.text(
  "Authorised Signatory",
  165,
  signatureY + 8,
  { align: "center" }
);

if (shopProfile?.owner_name) {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);

  pdf.text(
    shopProfile.owner_name,
    165,
    signatureY + 14,
    { align: "center" }
  );
}
      

// ===============================
// FOOTER TOP LINE
// ===============================

pdf.setDrawColor(...NAVY);
pdf.setLineWidth(0.6);
pdf.line(14, PH - 20, PW - 14, PH - 20);

// ===============================
// FOOTER SHOP DETAILS
// ===============================

pdf.setFont("helvetica", "bold");
pdf.setFontSize(10);
pdf.setTextColor(...NAVY);
pdf.text(shopProfile?.shop_name || "SETH BAIJNATH YOGENDRA KUMAR SARRAF", PW / 2, PH - 14, { align: "center" });

// ===============================
// FOOTER CONTACT
// ===============================

pdf.setFont("helvetica", "normal");
pdf.setFontSize(8);
pdf.setTextColor(...GRAY);
const footerText = [
  shopProfile?.address || "",
  shopProfile?.phone ? `Phone: ${shopProfile.phone}` : "",
].filter(Boolean).join(" | ");
pdf.text(footerText, PW / 2, PH - 9, { align: "center" });

// ===============================
// TAGLINE
// ===============================

pdf.setFont("times", "italic");
pdf.setFontSize(8);
pdf.setTextColor(...GOLD);
pdf.text("Purity • Trust • Tradition", PW / 2, PH - 4, { align: "center" });
// =======================================
// SAVE PDF
// =======================================

pdf.save(
  `${bill.bill_number}.pdf`
);
}