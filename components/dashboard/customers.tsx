'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

interface Customer {
  id?: string
  name: string
  phone: string
  email: string
  address: string
}

export default function CustomersComponent() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [newCustomer, setNewCustomer] = useState<Customer>({
    name: '',
    phone: '',
    email: '',
    address: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      setIsFetching(true)
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch customers',
        variant: 'destructive',
      })
    } finally {
      setIsFetching(false)
    }
  }

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
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

      if (editingId) {
        const { error } = await supabase
          .from('customers')
          .update(newCustomer)
          .eq('id', editingId)

        if (error) throw error
      } else {
        const { error } = await supabase.from('customers').insert([
          {
            ...newCustomer,
            user_id: user.id,
          },
        ])

        if (error) throw error
      }

      toast({
        title: 'Success',
        description: editingId ? 'Customer updated' : 'Customer added',
      })
      setNewCustomer({ name: '', phone: '', email: '', address: '' })
      setEditingId(null)
      fetchCustomers()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save customer',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return

    try {
      const supabase = createClient()
      const { error } = await supabase.from('customers').delete().eq('id', id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Customer deleted',
      })
      fetchCustomers()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete customer',
        variant: 'destructive',
      })
    }
  }

  const handleEdit = (customer: Customer) => {
    setNewCustomer(customer)
    setEditingId(customer.id || null)
  }

  if (isFetching) {
    return <div className="flex justify-center py-8">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Add Customer Form */}
      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="text-amber-900 dark:text-amber-300">
            {editingId ? 'Edit Customer' : 'Add New Customer'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-amber-700 dark:text-amber-400">
                  Customer Name
                </Label>
                <Input
                  id="name"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="border-amber-200 dark:border-amber-800"
                  placeholder="Customer name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-amber-700 dark:text-amber-400">
                  Phone
                </Label>
                <Input
                  id="phone"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="border-amber-200 dark:border-amber-800"
                  placeholder="Phone number with country code"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-amber-700 dark:text-amber-400">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  className="border-amber-200 dark:border-amber-800"
                  placeholder="Email address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-amber-700 dark:text-amber-400">
                  Address
                </Label>
                <Input
                  id="address"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  className="border-amber-200 dark:border-amber-800"
                  placeholder="Customer address"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              {editingId && (
                <Button
                  onClick={() => {
                    setEditingId(null)
                    setNewCustomer({ name: '', phone: '', email: '', address: '' })
                  }}
                  variant="outline"
                  className="border-amber-200 dark:border-amber-800"
                >
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleAddCustomer}
                disabled={isLoading}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isLoading ? 'Saving...' : editingId ? 'Update Customer' : 'Add Customer'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customers List */}
      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="text-amber-900 dark:text-amber-300">Your Customers</CardTitle>
          <CardDescription>Manage all your customers</CardDescription>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No customers added yet. Create your first customer above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-amber-200 dark:border-amber-800">
                  <tr>
                    <th className="text-left py-2 px-4 font-semibold text-amber-900 dark:text-amber-300">
                      Name
                    </th>
                    <th className="text-left py-2 px-4 font-semibold text-amber-900 dark:text-amber-300">
                      Phone
                    </th>
                    <th className="text-left py-2 px-4 font-semibold text-amber-900 dark:text-amber-300">
                      Email
                    </th>
                    <th className="text-left py-2 px-4 font-semibold text-amber-900 dark:text-amber-300">
                      Address
                    </th>
                    <th className="text-right py-2 px-4 font-semibold text-amber-900 dark:text-amber-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className="border-b border-amber-100 dark:border-amber-900">
                      <td className="py-3 px-4">{customer.name}</td>
                      <td className="py-3 px-4">{customer.phone}</td>
                      <td className="py-3 px-4">{customer.email}</td>
                      <td className="py-3 px-4">{customer.address}</td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <Button
                          onClick={() => handleEdit(customer)}
                          size="sm"
                          variant="outline"
                          className="border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400"
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => customer.id && handleDelete(customer.id)}
                          size="sm"
                          variant="destructive"
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
