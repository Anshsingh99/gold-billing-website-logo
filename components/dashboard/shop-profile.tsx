'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

interface ShopProfile {
  id?: string
  shop_name: string
  owner_name: string
  phone: string
  email: string
  address: string
  gst_number: string
}

export default function ShopProfileComponent() {
  const [profile, setProfile] = useState<ShopProfile>({
    shop_name: '',
    owner_name: '',
    phone: '',
    email: '',
    address: '',
    gst_number: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchShopProfile()
  }, [])

  const fetchShopProfile = async () => {
    try {
      setIsFetching(true)
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from('shop_profile')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setProfile(data)
      }
    } catch (error) {
      console.log('Profile fetch: no existing profile yet')
    } finally {
      setIsFetching(false)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('User not found')

      if (profile.id) {
        const { error } = await supabase
          .from('shop_profile')
          .update(profile)
          .eq('id', profile.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('shop_profile').insert([
          {
            ...profile,
            user_id: user.id,
          },
        ])

        if (error) throw error
      }

      toast({
        title: 'Success',
        description: 'Shop profile saved successfully',
      })
      setIsEditing(false)
      fetchShopProfile()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save profile',
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
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader>
        <CardTitle className="text-amber-900 dark:text-amber-300">Shop Profile</CardTitle>
        <CardDescription>Manage your shop details and information</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="shop_name" className="text-amber-700 dark:text-amber-400">
                Shop Name
              </Label>
              <Input
                id="shop_name"
                value={profile.shop_name}
                onChange={(e) => setProfile({ ...profile, shop_name: e.target.value })}
                disabled={!isEditing}
                className="border-amber-200 dark:border-amber-800"
                placeholder="Enter shop name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_name" className="text-amber-700 dark:text-amber-400">
                Owner Name
              </Label>
              <Input
                id="owner_name"
                value={profile.owner_name}
                onChange={(e) => setProfile({ ...profile, owner_name: e.target.value })}
                disabled={!isEditing}
                className="border-amber-200 dark:border-amber-800"
                placeholder="Enter owner name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-amber-700 dark:text-amber-400">
                Phone
              </Label>
              <Input
                id="phone"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                disabled={!isEditing}
                className="border-amber-200 dark:border-amber-800"
                placeholder="Enter phone number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-amber-700 dark:text-amber-400">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                disabled={!isEditing}
                className="border-amber-200 dark:border-amber-800"
                placeholder="Enter email"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address" className="text-amber-700 dark:text-amber-400">
                Address
              </Label>
              <Input
                id="address"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                disabled={!isEditing}
                className="border-amber-200 dark:border-amber-800"
                placeholder="Enter shop address"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="gst_number" className="text-amber-700 dark:text-amber-400">
                GST Number
              </Label>
              <Input
                id="gst_number"
                value={profile.gst_number}
                onChange={(e) => setProfile({ ...profile, gst_number: e.target.value })}
                disabled={!isEditing}
                className="border-amber-200 dark:border-amber-800"
                placeholder="Enter GST number"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            {!isEditing ? (
              <Button
                onClick={() => setIsEditing(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Edit Profile
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => {
                    setIsEditing(false)
                    fetchShopProfile()
                  }}
                  variant="outline"
                  className="border-amber-200 dark:border-amber-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {isLoading ? 'Saving...' : 'Save Profile'}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
