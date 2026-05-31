'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import BillForm from './bill-form'
import BillList from './bill-list'

export default function BillsComponent() {
  const [bills, setBills] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [editingBill, setEditingBill] = useState<any>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchBills()
  }, [])

  const fetchBills = async () => {
    try {
      setIsFetching(true)
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data: billsData, error: billsError } = await supabase
        .from('bills')
        .select('*, bill_items(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (billsError) throw billsError

      // Fetch customers separately and join manually
      const customerIds = [...new Set(billsData?.map((b: any) => b.customer_id) || [])]
      let customersMap: any = {}

      if (customerIds.length > 0) {
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('id, name, phone')
          .in('id', customerIds)

        if (customersError) throw customersError
        customersMap = Object.fromEntries(customersData?.map((c: any) => [c.id, c]) || [])
      }

      // Merge customer data with bills
      const mergedBills = billsData?.map((bill: any) => ({
        ...bill,
        customers: customersMap[bill.customer_id] || null,
      }))

      console.log('[v0] Bills fetched with customers:', mergedBills)
      setBills(mergedBills || [])
    } catch (error) {
      console.log('[v0] Error fetching bills:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch bills',
        variant: 'destructive',
      })
    } finally {
      setIsFetching(false)
    }
  }

  const handleBillSaved = () => {
    setShowForm(false)
    setEditingBill(null)
    fetchBills()
  }

  if (isFetching) {
    return <div className="flex justify-center py-8">Loading...</div>
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {!showForm && (
        <div className="flex justify-end px-2 sm:px-0">
          <Button
            onClick={() => {
              setEditingBill(null)
              setShowForm(true)
            }}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm"
          >
            Create New Bill
          </Button>
        </div>
      )}

      {showForm ? (
        <BillForm
          bill={editingBill}
          onSave={handleBillSaved}
          onCancel={() => {
            setShowForm(false)
            setEditingBill(null)
          }}
        />
      ) : (
        <BillList
          bills={bills}
          onEdit={(bill) => {
            setEditingBill(bill)
            setShowForm(true)
          }}
          onRefresh={fetchBills}
        />
      )}
    </div>
  )
}
