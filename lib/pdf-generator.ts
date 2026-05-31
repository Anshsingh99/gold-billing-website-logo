import jsPDF from 'jspdf'
import { createClient } from '@/lib/supabase/client'

interface Bill {
  id: string
  bill_number: string
  bill_date: string
  total_weight: number
  making_charge_rate: number
  making_charge_amount: number
  gst_rate: number
  gst_amount: number
  total_amount: number
  notes: string
  payment_status?: string
  paid_amount?: number
  remaining_amount?: number
  customers?: { name: string; phone: string; address: string }
  bill_items?: any[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** jsPDF built-in fonts don't support ₹. Use "Rs." instead. */
function fmtMoney(n: number) {
  return 'Rs.' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function hRule(
  pdf: jsPDF,
  x: number, y: number, w: number,
  rgb: [number, number, number],
  lw = 0.5
) {
  pdf.setDrawColor(...rgb)
  pdf.setLineWidth(lw)
  pdf.line(x, y, x + w, y)
}

async function fetchLogoBase64(): Promise<string | null> {
  /**
   * Replace '/logo.jpeg' with the actual URL or Supabase storage path of your logo.
   * Must return a base64 data-URI string (e.g. "data:image/jpeg;base64,...") or null.
   */
  try {
    const res = await fetch('/logo.jpeg')
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload  = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function generateBillPDF(bill: Bill) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not found')

  const { data: shopProfile } = await supabase
    .from('shop_profile').select('*').eq('user_id', user.id).single()

  const { data: billItems } = await supabase
    .from('bill_items').select('*').eq('bill_id', bill.id)

  const logoBase64 = await fetchLogoBase64()

  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const PW  = pdf.internal.pageSize.getWidth()   // 210
  const PH  = pdf.internal.pageSize.getHeight()  // 297
  const ML  = 14
  const MR  = 14
  const CW  = PW - ML - MR  // ~182mm

  // ── Palette ──────────────────────────────────────────────────────────────────
  const CREAM:     [number,number,number] = [253, 248, 240]
  const GOLD_MID:  [number,number,number] = [217, 119,   6]
  const GOLD_DARK: [number,number,number] = [139,  69,  19]
  const GOLD_LITE: [number,number,number] = [180, 140,  70]
  const WHITE:     [number,number,number] = [255, 255, 255]
  const LGRAY:     [number,number,number] = [245, 245, 245]
  const DGRAY:     [number,number,number] = [ 51,  51,  51]
  const MGRAY:     [number,number,number] = [100, 100, 100]
  const GREEN:     [number,number,number] = [ 22, 163,  74]
  const RED:       [number,number,number] = [220,  38,  38]
  const AMBER:     [number,number,number] = [180, 100,   6]

  const STATUS_COLOR: Record<string, [number,number,number]> = {
    paid: GREEN, partial: AMBER, unpaid: RED,
  }
  const STATUS_BG: Record<string, [number,number,number]> = {
    paid: [220, 252, 231], partial: [254, 243, 199], unpaid: [254, 226, 226],
  }
  const status = bill.payment_status || 'unpaid'
  const sTc    = STATUS_COLOR[status] || RED
  const sBg    = STATUS_BG[status]    || STATUS_BG.unpaid

  let y = 0

  // ── 1. Cream background + gold border rules ───────────────────────────────
  pdf.setFillColor(...CREAM)
  pdf.rect(0, 0, PW, PH, 'F')
  pdf.setDrawColor(...GOLD_MID)
  pdf.setLineWidth(1.5)
  pdf.line(ML, 6, PW - MR, 6)
  pdf.line(ML, PH - 6, PW - MR, PH - 6)

  y = 12

  // ── 2. Header: logo left, title centred ──────────────────────────────────
  const LOGO_W = 36, LOGO_H = 24

  if (logoBase64) {
    const imgFmt = logoBase64.startsWith('data:image/png') ? 'PNG' : 'JPEG'
    pdf.addImage(logoBase64, imgFmt, ML, y, LOGO_W, LOGO_H)
  }

  pdf.setFontSize(22)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(...GOLD_DARK)
  pdf.text('SETH BAIJNATH', PW / 2, y + 10, { align: 'center' })

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(...GOLD_LITE)
  pdf.text('YOGENDRA KUMAR SARRAF', PW / 2, y + 17, { align: 'center' })

  y += LOGO_H + 5
  hRule(pdf, ML, y, CW, GOLD_MID, 1.2)
  y += 5

  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(...GOLD_MID)
  pdf.text('INVOICE', ML, y)
  y += 8

  // ── 3. Three-column info box ──────────────────────────────────────────────
  const BOX_H = 42
  const BOX_Y = y
  const C1X   = ML
  const C2X   = ML + CW / 3
  const C3X   = ML + (2 * CW) / 3
  const P     = 3    // cell padding
  const LH    = 4.8  // line height

  pdf.setFillColor(...WHITE)
  pdf.roundedRect(ML, BOX_Y, CW, BOX_H, 2, 2, 'F')
  pdf.setDrawColor(...GOLD_LITE)
  pdf.setLineWidth(0.3)
  pdf.roundedRect(ML, BOX_Y, CW, BOX_H, 2, 2, 'S')
  pdf.line(C2X - 1, BOX_Y + 4, C2X - 1, BOX_Y + BOX_H - 4)
  pdf.line(C3X - 1, BOX_Y + 4, C3X - 1, BOX_Y + BOX_H - 4)

  function colHead(label: string, x: number, cy: number) {
    pdf.setFontSize(7.5)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(...GOLD_DARK)
    pdf.text(label, x + P, cy)
    return cy + LH + 0.5
  }
  function colLine(text: string, x: number, cy: number, maxW = 56) {
    pdf.setFontSize(7.5)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(...DGRAY)
    const lines = pdf.splitTextToSize(text, maxW - P * 2)
    pdf.text(lines, x + P, cy)
    return cy + lines.length * LH
  }

  // Shop column
  let sy = BOX_Y + 6
  sy = colHead('SHOP DETAILS', C1X, sy)
  sy = colLine(shopProfile?.shop_name || 'Seth Baijnath', C1X, sy)
  sy = colLine(`Owner: ${shopProfile?.owner_name || ''}`, C1X, sy)
  sy = colLine(`Phone: ${shopProfile?.phone || ''}`, C1X, sy)
  if (shopProfile?.gst_number) colLine(`GST: ${shopProfile.gst_number}`, C1X, sy)

  // Bill column
  let by2 = BOX_Y + 6
  by2 = colHead('BILL DETAILS', C2X, by2)
  by2 = colLine(`Bill #: ${bill.bill_number}`, C2X, by2)
  by2 = colLine(`Date: ${new Date(bill.bill_date).toLocaleDateString('en-IN')}`, C2X, by2)
  pdf.setFontSize(7.5)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(...sTc)
  pdf.text(status.toUpperCase(), C2X + P, by2)

  // Customer column
  let cy2 = BOX_Y + 6
  cy2 = colHead('CUSTOMER', C3X, cy2)
  cy2 = colLine(`Name:  ${bill.customers?.name || '-'}`, C3X, cy2)
  cy2 = colLine(`Phone: ${bill.customers?.phone || '-'}`, C3X, cy2)
  if (bill.customers?.address) colLine(`Addr:  ${bill.customers.address}`, C3X, cy2)

  y = BOX_Y + BOX_H + 7

  // ── 4. Items table ────────────────────────────────────────────────────────
  //
  // Column widths must sum to exactly CW.
  // Desc=38%, Qty=9%, Weight=16%, Rate=18%, Amount=19%
  // Amount column gets extra room so numbers never clip.
  //
  const CWS  = [
    CW * 0.38,  // Description
    CW * 0.09,  // Qty
    CW * 0.16,  // Weight
    CW * 0.18,  // Rate
    CW * 0.19,  // Amount  ← widened
  ]
  const HDR_H = 8
  const ROW_H = 7
  const CP    = 2.5   // cell inner padding

  // Table headers — no rupee symbol in built-in font
  const HDRS = ['Item Description', 'Qty', 'Weight (g)', 'Rate (Rs./g)', 'Amount (Rs.)']

  pdf.setFillColor(...GOLD_MID)
  pdf.rect(ML, y, CW, HDR_H, 'F')
  pdf.setFontSize(7.5)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(...WHITE)

  let hx = ML
  HDRS.forEach((h, i) => {
    const isRight = i >= 2  // Weight, Rate, Amount all right-aligned
    if (isRight) {
      pdf.text(h, hx + CWS[i] - CP, y + 5.5, { align: 'right' })
    } else {
      pdf.text(h, hx + CP, y + 5.5)
    }
    hx += CWS[i]
  })
  y += HDR_H

  const items  = (billItems && billItems.length > 0 ? billItems : bill.bill_items) || []
  let subtotal = 0

  items.forEach((item, idx) => {
    if (y + ROW_H > PH - 40) {
      pdf.addPage()
      pdf.setFillColor(CREAM[0], CREAM[1], CREAM[2])
      pdf.rect(0, 0, PW, PH, 'F')
      y = 14
    }

    const rowColor = idx % 2 === 0 ? WHITE : LGRAY
    pdf.setFillColor(...rowColor)
    pdf.rect(ML, y, CW, ROW_H, 'F')

    const purity = item.products?.gold_purity || item.purity || ''
    const name   = item.products?.name || item.product_name || 'Item'
    const label  = purity ? `${name} (${purity})` : name
    const amt    = item.amount || 0
    subtotal    += amt

    pdf.setFontSize(7.5)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(...DGRAY)

    const cells = [
      label,
      String(item.quantity || 0),
      (item.weight || 0).toFixed(3),
      fmtMoney(item.rate || 0),
      fmtMoney(amt),
    ]

    let rx = ML
    cells.forEach((cell, i) => {
      const isRight = i >= 2
      const maxW    = CWS[i] - CP * 2
      const lines   = pdf.splitTextToSize(cell, maxW)
      if (isRight) {
        pdf.text(lines, rx + CWS[i] - CP, y + 4.8, { align: 'right' })
      } else {
        pdf.text(lines, rx + CP, y + 4.8)
      }
      rx += CWS[i]
    })

    pdf.setDrawColor(...GOLD_LITE)
    pdf.setLineWidth(0.15)
    pdf.line(ML, y + ROW_H, ML + CW, y + ROW_H)
    y += ROW_H
  })

  // Outer border around the whole table
  pdf.setDrawColor(...GOLD_MID)
  pdf.setLineWidth(0.5)
  pdf.rect(ML, y - items.length * ROW_H - HDR_H, CW, items.length * ROW_H + HDR_H, 'S')

  y += 6

  // ── 5. Summary rows (right-aligned block) ─────────────────────────────────
  //
  // SLW = label column width, SVW = value column width
  // Together they must be wide enough for the longest value.
  // Longest expected: "Rs.1,00,000.00" ≈ 14 chars at 8pt ≈ 28mm → SVW=32
  //
  const SLW = 72   // label width
  const SVW = 38   // value width — widened to prevent clipping
  const SX  = PW - MR - SLW - SVW
  const SRH = 7

  function sumRow(label: string, value: string, bold = false, hi = false) {
    if (hi) {
      pdf.setFillColor(...GOLD_MID)
      pdf.rect(SX, y - 5, SLW + SVW, SRH + 1, 'F')
      pdf.setTextColor(...WHITE)
    } else {
      pdf.setTextColor(...DGRAY)
      pdf.setDrawColor(...GOLD_LITE)
      pdf.setLineWidth(0.15)
      pdf.line(SX, y + 2.5, SX + SLW + SVW, y + 2.5)
    }
    pdf.setFontSize(bold ? 9 : 8)
    pdf.setFont('helvetica', bold ? 'bold' : 'normal')
    pdf.text(label, SX + 3, y)
    // Value: right-aligned, anchored 2mm from the right edge of the block
    pdf.text(value, SX + SLW + SVW - 2, y, { align: 'right' })
    y += SRH
  }

  sumRow('Subtotal:', fmtMoney(subtotal))
  sumRow(
    `Making Charge (${bill.total_weight.toFixed(3)}g x Rs.${bill.making_charge_rate}):`,
    fmtMoney(bill.making_charge_amount)
  )
  sumRow(`GST (${bill.gst_rate}%):`, fmtMoney(bill.gst_amount))
  y += 1
  sumRow('GRAND TOTAL:', fmtMoney(bill.total_amount), true, true)

  y += 9

  // ── 6. Payment summary box ────────────────────────────────────────────────
  const PBH = 22
  pdf.setFillColor(...sBg)
  pdf.roundedRect(ML, y, CW, PBH, 2, 2, 'F')
  pdf.setDrawColor(...sTc)
  pdf.setLineWidth(0.4)
  pdf.roundedRect(ML, y, CW, PBH, 2, 2, 'S')

  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(...GOLD_DARK)
  pdf.text('PAYMENT SUMMARY', ML + 4, y + 8)

  pdf.setTextColor(...sTc)
  pdf.text(status.toUpperCase(), PW - MR - 4, y + 8, { align: 'right' })

  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(...DGRAY)
  pdf.text(`Amount Paid: ${fmtMoney(bill.paid_amount || 0)}`, ML + 4, y + 16)
  pdf.text(`Remaining Balance: ${fmtMoney(bill.remaining_amount || 0)}`, ML + 80, y + 16)

  y += PBH + 5

  // ── 7. Notes ──────────────────────────────────────────────────────────────
  if (bill.notes) {
    hRule(pdf, ML, y, CW, GOLD_LITE, 0.3)
    y += 5
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'italic')
    pdf.setTextColor(...MGRAY)
    const noteLines = pdf.splitTextToSize(`Notes: ${bill.notes}`, CW)
    pdf.text(noteLines, ML, y)
  }

  // ── 8. Footer ─────────────────────────────────────────────────────────────
  hRule(pdf, ML, PH - 12, CW, GOLD_MID, 0.5)
  pdf.setFontSize(7.5)
  pdf.setFont('helvetica', 'italic')
  pdf.setTextColor(...MGRAY)
  pdf.text(
    'Thank you for choosing Seth Baijnath Yogendra Kumar Sarraf  -  Quality Jewellery Since Generations',
    PW / 2, PH - 7,
    { align: 'center' }
  )

  pdf.save(`${bill.bill_number}.pdf`)
}