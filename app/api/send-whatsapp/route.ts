import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { customerPhone, customerName, billNumber, totalAmount,remainingAmount, shopName } =
      await request.json()

    if (!customerPhone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Format phone number (ensure it has country code)
    let formattedPhone = customerPhone
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+91' + formattedPhone.replace(/\D/g, '').slice(-10)
    }

    // Remove the '+' for wa.me link (it will be added automatically)
    const phoneForLink = formattedPhone.replace('+', '')

    // Create WhatsApp message
    const message = `Hi ${customerName},\n\nThank you for your purchase! 🎉\n\nBill Number: ${billNumber}\nTotal Amount: ₹${totalAmount.toFixed(2)}\nRemaining Amount: ₹${remainingAmount.toFixed(2)}\n\nYour bill has been generated. Please contact us for the bill details.\n\nBest regards,\n${shopName}`

    // Generate wa.me link
    const encodedMessage = encodeURIComponent(message)
    const whatsappLink = `https://wa.me/${phoneForLink}?text=${encodedMessage}`

    return NextResponse.json({
      success: true,
      whatsappLink,
      message: 'WhatsApp link generated successfully',
    })
  } catch (error) {
    console.error('[v0] WhatsApp link generation error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate WhatsApp link',
      },
      { status: 500 }
    )
  }
}
