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

  const { error } = await supabase.from("branches").insert({
    admin_id: authData.user.id,
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

export async function getInventoryAction() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) return [];

  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      product_balances (
        wholesale_qty,
        retail_qty,
        supermarket_qty
      )
    `)
    .eq("organization_id", (await supabase.from("profiles").select("organization_id").eq("id", authData.user.id).single()).data?.organization_id);

  if (error) {
    console.error("Error fetching inventory:", error);
    return [];
  }

  return data || [];
}

export async function distributeInventoryAction(prevState: unknown, updates: any[]) {
  if (!updates || updates.length === 0) return { error: "No updates provided." };

  const supabase = await createClient();
  
  // Directly call the RPC function for transactional atomic distribution
  const { error } = await supabase.rpc("distribute_inventory", {
    p_updates: updates
  });

  if (error) {
    return { error: "Distribution failed: " + error.message };
  }

  revalidatePath("/inventory-distribution");
  return { success: "Inventory distributed successfully!" };
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
