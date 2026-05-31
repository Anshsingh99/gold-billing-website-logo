"use client";

import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id?: string;
  name: string;
  gold_purity: string;
  description: string;
}

export default function ProductsComponent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [newProduct, setNewProduct] = useState<Product>({
    name: "",
    gold_purity: "22K",
    description: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setIsFetching(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive",
      });
    } finally {
      setIsFetching(false);
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.gold_purity) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("User not found");

      if (editingId) {
        const { error } = await supabase
          .from("products")
          .update(newProduct)
          .eq("id", editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert([
          {
            ...newProduct,
            user_id: user.id,
          },
        ]);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: editingId ? "Product updated" : "Product added",
      });
      setNewProduct({ name: "", gold_purity: "22K", description: "" });
      setEditingId(null);
      fetchProducts();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save product",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;

    try {
      const supabase = createClient();
      const { error } = await supabase.from("products").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product deleted",
      });
      fetchProducts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (product: Product) => {
    setNewProduct(product);
    setEditingId(product.id || null);
  };

  if (isFetching) {
    return <div className="flex justify-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Add Product Form */}
      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="text-sm sm:text-base text-amber-900 dark:text-amber-300">
            {editingId ? "Edit Product" : "Add New Product"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-4">
            <div className="grid gap-2 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className="text-xs sm:text-sm text-amber-700 dark:text-amber-400"
                >
                  Product Name
                </Label>
                <Input
                  id="name"
                  value={newProduct.name}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, name: e.target.value })
                  }
                  className="border-amber-200 dark:border-amber-800 text-sm"
                  placeholder="e.g., Gold Ring"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="purity"
                  className="text-xs sm:text-sm text-amber-700 dark:text-amber-400"
                >
                  Gold Purity
                </Label>
                <select
                  id="purity"
                  value={newProduct.gold_purity}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      gold_purity: e.target.value,
                    })
                  }
                  className="w-full px-2 sm:px-3 py-1 sm:py-2 border border-amber-200 dark:border-amber-800 rounded-md bg-background text-foreground text-sm"
                >
                  <option value="22K">22K</option>
                  <option value="18K">18K</option>
                  <option value="14K">14K</option>
                  <option value="10K">10K</option>
                  <option value="10K">Normal</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="description"
                  className="text-xs sm:text-sm text-amber-700 dark:text-amber-400"
                >
                  Description
                </Label>
                <Input
                  id="description"
                  value={newProduct.description}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      description: e.target.value,
                    })
                  }
                  className="border-amber-200 dark:border-amber-800 text-sm"
                  placeholder="Product description"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 justify-end">
              {editingId && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingId(null);
                    setNewProduct({
                      name: "",
                      gold_purity: "22K",
                      description: "",
                    });
                  }}
                  variant="outline"
                  className="border-amber-200 dark:border-amber-800 text-xs sm:text-sm"
                >
                  Cancel
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleAddProduct}
                disabled={isLoading}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm"
              >
                {isLoading ? "Saving..." : editingId ? "Update" : "Add"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products List */}
      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="text-sm sm:text-base text-amber-900 dark:text-amber-300">
            Your Products
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Manage all your gold products
          </CardDescription>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-8 text-xs sm:text-sm text-muted-foreground">
              No products added yet. Create your first product above.
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-xs sm:text-sm">
                <thead className="border-b border-amber-200 dark:border-amber-800">
                  <tr>
                    <th className="text-left py-2 px-2 sm:px-4 font-semibold text-amber-900 dark:text-amber-300">
                      Name
                    </th>
                    <th className="text-left py-2 px-2 sm:px-4 font-semibold text-amber-900 dark:text-amber-300 hidden sm:table-cell">
                      Purity
                    </th>
                    <th className="text-left py-2 px-2 sm:px-4 font-semibold text-amber-900 dark:text-amber-300 hidden md:table-cell">
                      Description
                    </th>
                    <th className="text-center py-2 px-2 sm:px-4 font-semibold text-amber-900 dark:text-amber-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b border-amber-100 dark:border-amber-900"
                    >
                      <td className="py-2 sm:py-3 px-2 sm:px-4">
                        {product.name}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 hidden sm:table-cell">
                        {product.gold_purity}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 hidden md:table-cell truncate">
                        {product.description}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-center">
                        <div className="flex flex-col sm:flex-row gap-1 justify-center">
                          <Button
                            onClick={() => handleEdit(product)}
                            size="xs"
                            variant="outline"
                            className="border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 text-xs px-2"
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() =>
                              product.id && handleDelete(product.id)
                            }
                            size="xs"
                            variant="destructive"
                            className="text-xs px-2"
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
    </div>
  );
}
