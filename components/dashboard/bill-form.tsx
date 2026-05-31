'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

interface BillItem {
  id?: string
  product_id: string
  quantity: number
  weight: number
  rate: number
  amount: number
}

interface Customer {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  gold_purity: string
}

interface Bill {
  id?: string
  customer_id: string
  bill_number: string
  total_weight: number
  making_charge_rate: number
  making_charge_amount: number
  gst_rate: number
  gst_amount: number
  total_amount: number
  notes: string
  bill_items?: BillItem[]
  payment_method?: string
  paid_amount?: number
  remaining_amount?: number
  payment_status?: string
  installment_enabled?: boolean
  total_installments?: number
  current_installment?: number
}

export default function BillForm({
  bill,
  onSave,
  onCancel,
}: {
  bill?: Bill
  onSave: () => void
  onCancel: () => void
}) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [billData, setBillData] = useState<Bill>({
    customer_id: '',
    bill_number: `BILL-${Date.now()}`,
    total_weight: 0,
    making_charge_rate: 0,
    making_charge_amount: 0,
    gst_rate: 18,
    gst_amount: 0,
    total_amount: 0,
    notes: '',
    payment_method: 'cash',
    paid_amount: 0,
    remaining_amount: 0,
    payment_status: 'unpaid',
    installment_enabled: false,
    total_installments: 0,
    current_installment: 0,
  })
  const [billItems, setBillItems] = useState<BillItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (bill?.id) {
      console.log('[v0] Bill received for editing:', bill)
      setIsEditing(true)
      setBillData(bill)
      setBillItems(bill.bill_items || [])
      console.log('[v0] Bill state set - isEditing:', true, 'billId:', bill.id)
    } else {
      console.log('[v0] No bill provided, creating new bill')
      setIsEditing(false)
    }
  }, [bill])

  const fetchData = async () => {
    try {
      setIsFetching(true)
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const [customersRes, productsRes] = await Promise.all([
        supabase.from('customers').select('*').eq('user_id', user.id),
        supabase.from('products').select('*').eq('user_id', user.id),
      ])

      setCustomers(customersRes.data || [])
      setProducts(productsRes.data || [])
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch customers and products',
        variant: 'destructive',
      })
    } finally {
      setIsFetching(false)
    }
  }

  const addBillItem = () => {
    setBillItems([
      ...billItems,
      {
        product_id: '',
        quantity: 1,
        weight: 0,
        rate: 0,
        amount: 0,
      },
    ])
  }

  const updateBillItem = (index: number, field: string, value: any) => {
    const updated = [...billItems]
    const item = updated[index]
    ;(item as any)[field] = value

    // Calculate amount
    if (field === 'weight' || field === 'rate') {
      item.amount = item.weight * item.rate
    }

    updated[index] = item
    setBillItems(updated)
    calculateTotals(updated)
  }

  const removeBillItem = (index: number) => {
    const updated = billItems.filter((_, i) => i !== index)
    setBillItems(updated)
    calculateTotals(updated)
  }

  const calculateTotals = (items: BillItem[], currentBillData?: Bill) => {
    const data = currentBillData || billData
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
    const makingChargeAmount = totalWeight * data.making_charge_rate
    const gstAmount = (subtotal + makingChargeAmount) * (data.gst_rate / 100)
    const totalAmount = subtotal + makingChargeAmount + gstAmount

    console.log('[v0] Calculating totals:', { totalWeight, subtotal, makingChargeAmount, gstAmount, totalAmount, making_charge_rate: data.making_charge_rate })

    setBillData((prev) => ({
      ...prev,
      total_weight: totalWeight,
      making_charge_amount: makingChargeAmount,
      gst_amount: gstAmount,
      total_amount: totalAmount,
    }))
  }

  const handleSaveBill = async () => {
    if (!billData.customer_id || billItems.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select a customer and add at least one item',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('User not found')

      // Calculate remaining amount
      const remaining = (billData.total_amount || 0) - (billData.paid_amount || 0)
      
      let billId = billData.id

      if (isEditing && billId) {
        // Update existing bill - exclude id, bill_date, user_id, bill_items, and customers from update
        const { id, bill_date, user_id, bill_items, customers, ...updateData } = billData as any
        const cleanUpdateData = {
          ...updateData,
          remaining_amount: Math.max(0, remaining),
        }
        
        console.log('[v0] Updating bill with ID:', billId, 'Data:', cleanUpdateData)

        const { error: updateError } = await supabase
          .from('bills')
          .update(cleanUpdateData)
          .eq('id', billId)
          .eq('user_id', user.id)

        if (updateError) {
          console.log('[v0] Update error:', updateError)
          throw updateError
        }
        console.log('[v0] Bill updated successfully')

        // Delete existing items and re-insert
        await supabase.from('bill_items').delete().eq('bill_id', billId)

        const itemsToInsert = billItems.map((item) => ({
          ...item,
          bill_id: billId,
        }))

        const { error: itemsError } = await supabase.from('bill_items').insert(itemsToInsert)
        if (itemsError) throw itemsError
      } else {
        // Create new bill - exclude bill_items and customers from insert
        const { bill_items, customers, ...billDataForInsert } = billData as any
        const remaining = (billDataForInsert.total_amount || 0) - (billDataForInsert.paid_amount || 0)
        
        const insertData = {
          ...billDataForInsert,
          user_id: user.id,
          remaining_amount: Math.max(0, remaining),
        }
        
        console.log('[v0] Creating new bill with data:', insertData)

        const { data: newBill, error: insertError } = await supabase
          .from('bills')
          .insert([insertData])
          .select()

        if (insertError) throw insertError
        billId = newBill?.[0]?.id

        // Add bill items
        if (billId) {
          const itemsToInsert = billItems.map((item) => ({
            ...item,
            bill_id: billId,
          }))

          const { error: itemsError } = await supabase.from('bill_items').insert(itemsToInsert)
          if (itemsError) throw itemsError
        }
      }

      toast({
        title: 'Success',
        description: isEditing ? 'Bill updated successfully' : 'Bill created successfully',
      })
      onSave()
    } catch (error) {
      console.log('[v0] Error saving bill:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save bill',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return <div className="flex justify-center py-8">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Customer and Basic Info */}
      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="text-sm sm:text-base text-amber-900 dark:text-amber-300">Bill Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="bill_number" className="text-xs sm:text-sm text-amber-700 dark:text-amber-400">
                Bill Number
              </Label>
              <Input
                id="bill_number"
                value={billData.bill_number}
                onChange={(e) => setBillData({ ...billData, bill_number: e.target.value })}
                className="border-amber-200 dark:border-amber-800 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer" className="text-xs sm:text-sm text-amber-700 dark:text-amber-400">
                Customer
              </Label>
              <select
                id="customer"
                value={billData.customer_id}
                onChange={(e) => setBillData({ ...billData, customer_id: e.target.value })}
                className="w-full px-2 sm:px-3 py-1 sm:py-2 border border-amber-200 dark:border-amber-800 rounded-md bg-background text-foreground text-sm"
              >
                <option value="">Select Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gst_rate" className="text-xs sm:text-sm text-amber-700 dark:text-amber-400">
                GST Rate (%)
              </Label>
              <Input
                id="gst_rate"
                type="number"
                value={billData.gst_rate}
                onChange={(e) => {
                  const newRate = parseFloat(e.target.value)
                  setBillData({ ...billData, gst_rate: newRate })
                  calculateTotals(billItems)
                }}
                className="border-amber-200 dark:border-amber-800 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bill Items */}
      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="text-sm sm:text-base text-amber-900 dark:text-amber-300">Bill Items</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Add products to your bill</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 sm:space-y-4 overflow-x-auto">
            {billItems.map((item, index) => (
              <div key={index} className="grid gap-2 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 p-2 sm:p-4 border border-amber-100 dark:border-amber-900 rounded">
                <div className="space-y-2">
                  <Label className="text-amber-700 dark:text-amber-400 text-xs">Product</Label>
                  <select
                    value={item.product_id}
                    onChange={(e) => updateBillItem(index, 'product_id', e.target.value)}
                    className="w-full px-2 py-1 border border-amber-200 dark:border-amber-800 rounded text-sm bg-background"
                  >
                    <option value="">Select</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-amber-700 dark:text-amber-400 text-xs">Qty</Label>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateBillItem(index, 'quantity', parseFloat(e.target.value))}
                    className="border-amber-200 dark:border-amber-800 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-amber-700 dark:text-amber-400 text-xs">Weight (g)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={item.weight}
                    onChange={(e) => updateBillItem(index, 'weight', parseFloat(e.target.value))}
                    className="border-amber-200 dark:border-amber-800 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-amber-700 dark:text-amber-400 text-xs">Rate (₹/g)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.rate}
                    onChange={(e) => updateBillItem(index, 'rate', parseFloat(e.target.value))}
                    className="border-amber-200 dark:border-amber-800 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-amber-700 dark:text-amber-400 text-xs">Amount</Label>
                  <div className="px-2 py-1 border border-amber-200 dark:border-amber-800 rounded bg-amber-50 dark:bg-amber-950 text-sm font-semibold">
                    ₹{item.amount.toFixed(2)}
                  </div>
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={() => removeBillItem(index)}
                    size="sm"
                    variant="destructive"
                    className="w-full"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}

            <Button
              onClick={addBillItem}
              variant="outline"
              className="w-full border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400"
            >
              Add Item
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charges and Totals */}
      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="text-sm sm:text-base text-amber-900 dark:text-amber-300">Charges & Totals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="making_charge_rate" className="text-xs sm:text-sm text-amber-700 dark:text-amber-400">
                  Making Charge Rate (₹/g)
                </Label>
                <Input
                  id="making_charge_rate"
                  type="number"
                  step="0.01"
                  value={billData.making_charge_rate}
                  onChange={(e) => {
                    const newRate = parseFloat(e.target.value) || 0
                    const updatedBillData = { ...billData, making_charge_rate: newRate }
                    setBillData(updatedBillData)
                    calculateTotals(billItems, updatedBillData)
                  }}
                  className="border-amber-200 dark:border-amber-800"
                />
              </div>
            </div>

            <div className="border-t border-amber-200 dark:border-amber-800 pt-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Items Total:</span>
                  <span className="font-semibold">
                    ₹{billItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Making Charge ({billData.total_weight.toFixed(3)}g × ₹{billData.making_charge_rate}):</span>
                  <span className="font-semibold">₹{billData.making_charge_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST ({billData.gst_rate}%):</span>
                  <span className="font-semibold">₹{billData.gst_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg border-t border-amber-200 dark:border-amber-800 pt-2 text-amber-900 dark:text-amber-300">
                  <span className="font-bold">Total Amount:</span>
                  <span className="font-bold">₹{billData.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-xs sm:text-sm text-amber-700 dark:text-amber-400">
                Notes
              </Label>
              <Input
                id="notes"
                value={billData.notes}
                onChange={(e) => setBillData({ ...billData, notes: e.target.value })}
                className="border-amber-200 dark:border-amber-800"
                placeholder="Additional notes (optional)"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Options */}
      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="text-sm sm:text-base text-amber-900 dark:text-amber-300">Payment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="payment_method" className="text-xs sm:text-sm text-amber-700 dark:text-amber-400">
                  Payment Method
                </Label>
                <select
                  id="payment_method"
                  value={billData.payment_method || 'cash'}
                  onChange={(e) => setBillData({ ...billData, payment_method: e.target.value })}
                  className="w-full px-2 sm:px-3 py-1 sm:py-2 border border-amber-200 dark:border-amber-800 rounded-md bg-background text-foreground text-sm"
                >
                  <option value="cash">Cash</option>
                  <option value="online">Online Transfer</option>
                  <option value="upi">UPI</option>
                  <option value="check">Check</option>
                  <option value="card">Card</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paid_amount" className="text-xs sm:text-sm text-amber-700 dark:text-amber-400">
                  Amount Paid (₹)
                </Label>
                <Input
                  id="paid_amount"
                  type="number"
                  step="0.01"
                  value={billData.paid_amount || 0}
                  onChange={(e) => {
                    const paid = parseFloat(e.target.value) || 0
                    const remaining = Math.max(0, (billData.total_amount || 0) - paid)
                    setBillData({
                      ...billData,
                      paid_amount: paid,
                      remaining_amount: remaining,
                      payment_status: remaining === 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
                    })
                  }}
                  className="border-amber-200 dark:border-amber-800 text-sm"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="border-t border-amber-200 dark:border-amber-800 pt-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Bill Amount:</span>
                  <span className="font-semibold">₹{billData.total_amount?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount Paid:</span>
                  <span className="font-semibold">₹{(billData.paid_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg border-t border-amber-200 dark:border-amber-800 pt-2 text-amber-900 dark:text-amber-300">
                  <span className="font-bold">Remaining Balance:</span>
                  <span className="font-bold">₹{(billData.remaining_amount || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="installment"
                  checked={billData.installment_enabled || false}
                  onChange={(e) => setBillData({ ...billData, installment_enabled: e.target.checked })}
                  className="w-4 h-4 rounded border-amber-200 dark:border-amber-800"
                />
                <Label htmlFor="installment" className="text-xs sm:text-sm text-amber-700 dark:text-amber-400 cursor-pointer">
                  Enable Installments
                </Label>
              </div>
            </div>

            {billData.installment_enabled && (
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 p-3 sm:p-4 bg-amber-50 dark:bg-amber-950 rounded-md">
                <div className="space-y-2">
                  <Label htmlFor="total_installments" className="text-xs sm:text-sm text-amber-700 dark:text-amber-400">
                    Total Installments
                  </Label>
                  <Input
                    id="total_installments"
                    type="number"
                    min="1"
                    value={billData.total_installments || 1}
                    onChange={(e) => setBillData({ ...billData, total_installments: parseInt(e.target.value) || 1 })}
                    className="border-amber-200 dark:border-amber-800 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm text-amber-700 dark:text-amber-400">
                    Per Installment Amount
                  </Label>
                  <div className="px-2 sm:px-3 py-1 sm:py-2 border border-amber-200 dark:border-amber-800 rounded bg-background text-sm font-semibold">
                    ₹{((billData.total_amount || 0) / (billData.total_installments || 1)).toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 justify-end">
        <Button size="sm" onClick={onCancel} variant="outline" className="border-amber-200 dark:border-amber-800 text-xs sm:text-sm">
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSaveBill}
          disabled={isLoading}
          className="bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm"
        >
          {isLoading ? 'Saving...' : isEditing ? 'Update Bill' : 'Create Bill'}
        </Button>
      </div>
    </div>
  )
}
