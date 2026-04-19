"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function addBranchAction(prevState: unknown, formData: FormData) {
  const name = formData.get("branchName") as string;
  if (!name || !name.trim()) return { error: "Branch name is required." };

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return { error: "Unauthorized access." };
  }

  // Fetch organization_id from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", authData.user.id)
    .single();

  const { error } = await supabase.from("branches").insert({
    admin_id: authData.user.id,
    organization_id: profile?.organization_id,
    name: name.trim(),
  });

  if (error) {
    if (error.code === '23505') {
       return { error: "A branch with this name already exists." };
    }
    return { error: "Failed to add branch: " + error.message };
  }

  revalidatePath("/");
  return { success: "Branch added successfully." };
}

export async function createStaffAction(prevState: unknown, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;
  const branchName = formData.get("branchName") as string;

  if (!email || !password || !role || !branchName) {
    return { error: "All fields are required." };
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return { error: "Unauthorized." };
  }
  
  const supabaseAdmin = createAdminClient();

  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !userData.user) {
    return { error: createError?.message || "Failed to create staff account." };
  }

  const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
    id: userData.user.id,
    email,
    role: role.toLowerCase(),
    branch_name: branchName,
  });

  if (profileError) {
    return { error: "Created user, but failed to link profile. " + profileError.message };
  }

  revalidatePath("/");
  return { success: "Staff account created successfully!" };
}

export async function businessSignupAction(prevState: unknown, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  const businessName = formData.get("businessName") as string;

  if (!email || !password || !fullName || !businessName) {
    return { error: "All fields are required." };
  }

  const supabase = await createClient();

  // 1. Sign up user
  const { data: authData, error: signupError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (signupError || !authData.user) {
    return { error: signupError?.message || "Registration failed." };
  }

  // 2. Create organization
  const { data: orgData, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name: businessName,
      owner_id: authData.user.id,
    })
    .select("id")
    .single();

  if (orgError) {
    return { error: "Created account, but failed to create organization. " + orgError.message };
  }

  // 3. Create or update profile
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: authData.user.id,
      email: email,
      role: "admin",
      organization_id: orgData.id,
      organization_name: businessName,
    });

  if (profileError) {
    return { error: "Created business, but failed to create profile. " + profileError.message };
  }

  redirect("/");
}

export async function getBranchesAction() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", authData.user.id)
    .single();

  if (!profile?.organization_id) return [];

  const { data, error } = await supabase
    .from("branches")
    .select("*")
    .or(`admin_id.eq.${authData.user.id}${profile?.organization_id ? `,organization_id.eq.${profile.organization_id}` : ''}`)
    .order("name");

  if (error) {
    console.error("Error fetching branches:", error);
    return [];
  }

  return data || [];
}

export async function getInventoryAction(branchId?: string) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", authData.user.id)
    .single();

  if (!profile?.organization_id) return [];

  let query = supabase
    .from("products")
    .select(`
      *,
      product_balances (
        wholesale_qty,
        retail_qty,
        supermarket_qty,
        branch_id
      )
    `)
    .eq("organization_id", profile.organization_id);

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching inventory:", error);
    return [];
  }

  // If a branchId is provided, filter the balances for that branch specifically
  if (branchId) {
    return (data || []).map(product => ({
      ...product,
      product_balances: product.product_balances?.find((pb: any) => pb.branch_id === branchId) || null
    }));
  }

  return data || [];
}

export async function distributeInventoryAction(prevState: unknown, { updates, branchId }: { updates: any[], branchId: string }) {
  if (!updates || updates.length === 0) return { error: "No updates provided." };
  if (!branchId) return { error: "Target branch is required." };

  const supabase = await createClient();
  
  // Directly call the RPC function for transactional atomic distribution
  const { error } = await supabase.rpc("distribute_inventory", {
    p_updates: updates,
    p_branch_id: branchId
  });

  if (error) {
    return { error: "Distribution failed: " + error.message };
  }

  revalidatePath("/inventory-distribution");
  return { success: "Inventory distributed successfully to the selected branch!" };
}

export async function batchAddProductsAction(prevState: unknown, products: any[]) {
  if (!products || products.length === 0) return { error: "No products provided." };

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) return { error: "Unauthorized." };

  // Fetch organization_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", authData.user.id)
    .single();

  if (!profile?.organization_id) return { error: "Organization not found." };

  const productsWithOrg = products.map(p => ({
    ...p,
    organization_id: profile.organization_id,
    quantity: parseInt(p.quantity) || 0,
    retail_price: parseFloat(p.retail_price) || 0,
    wholesale_price: parseFloat(p.wholesale_price) || 0,
    cost_price: parseFloat(p.cost_price) || 0,
    supermarket_price: parseFloat(p.supermarket_price) || 0,
    min_stock_level: parseInt(p.min_stock_level) || 10,
  }));

  const { error } = await supabase
    .from("products")
    .insert(productsWithOrg);

  if (error) {
    return { error: "Batch insert failed: " + error.message };
  }

  revalidatePath("/inventory-distribution");
  return { success: `${products.length} products added successfully!` };
}

export async function updateProductPricesAction(prevState: unknown, update: { id: string, wholesale_price: number, retail_price: number, supermarket_price: number }) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) return { error: "Unauthorized." };

  const { error } = await supabase
    .from("products")
    .update({
      wholesale_price: update.wholesale_price,
      retail_price: update.retail_price,
      supermarket_price: update.supermarket_price
    })
    .eq("id", update.id);

  if (error) {
    return { error: "Failed to update prices: " + error.message };
  }

  revalidatePath("/catalog");
  return { success: "Prices updated successfully." };
}

export async function deleteProductAction(prevState: unknown, productId: string) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) return { error: "Unauthorized." };

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) {
    return { error: "Failed to delete product: " + error.message };
  }

  revalidatePath("/catalog");
  revalidatePath("/inventory");
  revalidatePath("/inventory-distribution");
  return { success: "Product deleted successfully." };
}

export async function getSalesDataAction() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) return { error: "Unauthorized." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", authData.user.id)
    .single();

  if (!profile?.organization_id) {
    return { error: "Profile setup incomplete." };
  }

  // Fetch transactions
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select(`
      *,
      transaction_items (*)
    `)
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching sales data:", error);
    return { error: "Failed to fetch sales data." };
  }

  return { success: true, transactions: transactions || [] };
}

// Helper to quickly populate test data (since it's a new table)
export async function generateMockSalesDataAction() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) return { error: "Unauthorized." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, branch_name")
    .eq("id", authData.user.id)
    .single();

  if (!profile?.organization_id) return { error: "No org" };

  // Generate 50 random transactions across last 30 days
  const methods = ['Cash', 'Card', 'Mobile Transfer'];
  const branches = ['Main Branch', 'Downtown Pharmacy', 'Uptown Retail', 'City Supermarket'];
  
  const mockTransactions = Array.from({ length: 50 }).map((_, i) => {
    // Random date within last 365 days, weighted towards recent
    const daysAgo = Math.floor(Math.random() * (i < 20 ? 30 : 365));
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    return {
      organization_id: profile.organization_id,
      branch_name: branches[Math.floor(Math.random() * branches.length)],
      total_amount: +(Math.random() * 500 + 10).toFixed(2),
      payment_method: methods[Math.floor(Math.random() * methods.length)],
      cashier_id: authData.user.id,
      cashier_name: "Admin User",
      created_at: date.toISOString()
    };
  });

  const { error } = await supabase.from("transactions").insert(mockTransactions);
  if (error) return { error: error.message };
  
  return { success: "Mock data generated successfully." };
}
