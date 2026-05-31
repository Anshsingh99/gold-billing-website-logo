"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import Image from "next/image";
import ShopProfileComponent from "@/components/dashboard/shop-profile";
import ProductsComponent from "@/components/dashboard/products";
import CustomersComponent from "@/components/dashboard/customers";
import BillsComponent from "@/components/dashboard/bills";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBills: 0,
    totalRevenue: 0,
    totalProducts: 0,
    totalCustomers: 0,
  });
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
      } else {
        setUser(user);
        await fetchStats(supabase);
      }
      setIsLoading(false);
    };

    getUser();
  }, [router]);

  const fetchStats = async (supabase: any) => {
    try {
      // Get total bills count
      const { count: billsCount } = await supabase
        .from("bills")
        .select("*", { count: "exact", head: true });

      // Get total revenue
      const { data: billsData } = await supabase
        .from("bills")
        .select("total_amount");

      const totalRevenue =
        billsData?.reduce(
          (sum: number, bill: any) => sum + (bill.total_amount || 0),
          0,
        ) || 0;

      // Get products count
      const { count: productsCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true });

      // Get customers count
      const { count: customersCount } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true });

      setStats({
        totalBills: billsCount || 0,
        totalRevenue,
        totalProducts: productsCount || 0,
        totalCustomers: customersCount || 0,
      });
    } catch (error) {
      console.log("[v0] Error fetching stats:", error);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Image
              src="/logo.png"
              alt="Seth Baijnath Logo"
              width={60}
              height={60}
              priority
              className="w-12 sm:w-16 h-auto"
            />
            <div>
              <h1 className="text-base sm:text-xl font-bold text-amber-800 dark:text-amber-300">
                Seth Baijnath
              </h1>
              <p className="text-xs text-muted-foreground">
                Jewelry Management System
              </p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            size="sm"
            variant="outline"
            className="border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950 text-xs sm:text-sm"
          >
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4 sm:space-y-6"
        >
          <div className="w-full overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
            <TabsList className="inline-flex w-full min-w-max sm:grid sm:w-full sm:grid-cols-5 bg-card border">
              <TabsTrigger
                value="dashboard"
                className="text-xs sm:text-sm flex-1 sm:flex-none"
              >
                Dashboard
              </TabsTrigger>
              <TabsTrigger
                value="shop"
                className="text-xs sm:text-sm flex-1 sm:flex-none"
              >
                Shop
              </TabsTrigger>
              <TabsTrigger
                value="products"
                className="text-xs sm:text-sm flex-1 sm:flex-none"
              >
                Products
              </TabsTrigger>
              <TabsTrigger
                value="customers"
                className="text-xs sm:text-sm flex-1 sm:flex-none"
              >
                Customers
              </TabsTrigger>
              <TabsTrigger
                value="bills"
                className="text-xs sm:text-sm flex-1 sm:flex-none"
              >
                Bills
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Dashboard Overview */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid gap-2 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-amber-200 dark:border-amber-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-400">
                    Total Bills
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-amber-900 dark:text-amber-300">
                    {stats.totalBills}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Created</p>
                </CardContent>
              </Card>

              <Card className="border-amber-200 dark:border-amber-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-400">
                    Total Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-amber-900 dark:text-amber-300">
                    ₹{stats.totalRevenue.toFixed(0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    All bills
                  </p>
                </CardContent>
              </Card>

              <Card className="border-amber-200 dark:border-amber-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-400">
                    Products
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-amber-900 dark:text-amber-300">
                    {stats.totalProducts}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total items
                  </p>
                </CardContent>
              </Card>

              <Card className="border-amber-200 dark:border-amber-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-400">
                    Customers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-amber-900 dark:text-amber-300">
                    {stats.totalCustomers}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Total</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-amber-200 dark:border-amber-800">
              <CardHeader>
                <CardTitle className="text-sm sm:text-base text-amber-900 dark:text-amber-300">
                  Quick Actions
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Get started with your gold shop management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:gap-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-4">
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={() => setActiveTab("bills")}
                  >
                    Create Bill
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab("products")}
                  >
                    Add Product
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab("customers")}
                  >
                    Add Customer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shop Profile Tab */}
          <TabsContent value="shop">
            <ShopProfileComponent />
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <ProductsComponent />
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers">
            <CustomersComponent />
          </TabsContent>

          {/* Bills Tab */}
          <TabsContent value="bills">
            <BillsComponent />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
