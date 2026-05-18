"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { fetchAllProducts, fetchAllRows } from "@/utils/supabase/queries";
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
    branch_name: name.trim(),
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
  
  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("organization_id, organization_name")
    .eq("id", authData.user.id)
    .single();

  if (!adminProfile?.organization_id) {
    return { error: "Your admin profile is incomplete (missing organization)." };
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
    organization_id: adminProfile.organization_id,
    organization_name: adminProfile.organization_name,
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
    .order("branch_name");

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

  try {
    const data = await fetchAllProducts(
      supabase,
      profile.organization_id,
      `*, product_balances ( wholesale_qty, retail_qty, supermarket_qty, branch_id )`
    );

    // If a branchId is provided, filter the balances for that branch specifically
    if (branchId) {
      return (data || []).map(product => ({
        ...product,
        product_balances: product.product_balances?.find((pb: any) => pb.branch_id === branchId) || null
      }));
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return [];
  }
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

export async function updateProductAction(prevState: unknown, update: { 
  id: string, 
  wholesale_price?: number, 
  retail_price?: number, 
  supermarket_price?: number, 
  quantity?: number 
}) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) return { error: "Unauthorized." };

  const updateData: any = {};
  if (update.wholesale_price !== undefined) updateData.wholesale_price = update.wholesale_price;
  if (update.retail_price !== undefined) updateData.retail_price = update.retail_price;
  if (update.supermarket_price !== undefined) updateData.supermarket_price = update.supermarket_price;
  if (update.quantity !== undefined) updateData.quantity = update.quantity;

  const { error } = await supabase
    .from("products")
    .update(updateData)
    .eq("id", update.id);

  if (error) {
    return { error: "Failed to update product: " + error.message };
  }

  revalidatePath("/catalog");
  revalidatePath("/inventory");
  revalidatePath("/inventory-distribution");
  return { success: "Product updated successfully." };
}

export async function restockProductAction(prevState: unknown, { productId, quantityToAdd }: { productId: string, quantityToAdd: number }) {
  if (!productId) return { error: "Product ID is required." };
  if (quantityToAdd <= 0) return { error: "Quantity must be greater than zero." };

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) return { error: "Unauthorized." };

  // Fetch current quantity to increment correctly
  const { data: product, error: fetchError } = await supabase
    .from("products")
    .select("quantity")
    .eq("id", productId)
    .single();

  if (fetchError || !product) {
    return { error: "Product not found." };
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({
      quantity: (product.quantity || 0) + quantityToAdd
    })
    .eq("id", productId);

  if (updateError) {
    return { error: "Restock failed: " + updateError.message };
  }

  revalidatePath("/catalog");
  revalidatePath("/inventory");
  revalidatePath("/inventory-distribution");
  return { success: `Successfully added ${quantityToAdd} units to stock.` };
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

  // Fetch transactions using Admin Client and fetchAllRows to bypass RLS and row limits
  const supabaseAdmin = createAdminClient();
  try {
    const transactions = await fetchAllRows(
      supabaseAdmin,
      "transactions",
      "*, transaction_items (*)",
      "organization_id",
      profile.organization_id
    );

    // Re-order locally since fetchAllRows might not preserve order if multiple pages
    const sortedTransactions = (transactions || []).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return { success: true, transactions: sortedTransactions };
  } catch (error: any) {
    console.error("Error fetching sales data:", error);
    return { error: error?.message || error?.toString() || "Failed to fetch sales data." };
  }
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
  const types = ['retail', 'wholesale', 'supermarket'];
  
  const mockTransactions = Array.from({ length: 50 }).map((_, i) => {
    // Random date within last 365 days, weighted towards recent
    const daysAgo = Math.floor(Math.random() * (i < 20 ? 30 : 365));
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    return {
      organization_id: profile.organization_id,
      branch_name: branches[Math.floor(Math.random() * branches.length)],
      total_amount: +(Math.random() * 500 + 50).toFixed(2),
      payment_method: methods[Math.floor(Math.random() * methods.length)],
      cashier_id: authData.user.id,
      cashier_name: "Admin User",
      created_at: date.toISOString(),
      seller_name: "Admin User",
      buyer_name: "Walk-in Customer",
      status: 'completed',
      type: types[Math.floor(Math.random() * types.length)],
      is_audited: true,
      is_cleared: true
    };
  });

  const { data: insertedTransactions, error: insertError } = await supabase
    .from("transactions")
    .insert(mockTransactions)
    .select("id, total_amount");

  if (insertError) return { error: insertError.message };

  // For each inserted transaction, create 2-3 mock items
  const mockProducts = [
    { name: "Paracetamol 500mg", sku: "PRC-500-TAB" },
    { name: "Amoxicillin 250mg", sku: "AMX-250-CAP" },
    { name: "Ibuprofen 400mg", sku: "IBU-400-TAB" },
    { name: "Vitamin C 1000mg", sku: "VIT-C-EFFER" },
    { name: "Cetirizine 10mg", sku: "CET-10-TAB" }
  ];

  const itemsToInsert: any[] = [];
  insertedTransactions.forEach((t: any) => {
    const itemCount = Math.floor(Math.random() * 3) + 1; // 1 to 3 items
    const selectedProducts = [...mockProducts].sort(() => 0.5 - Math.random()).slice(0, itemCount);
    
    // Divide total amount among items
    const basePrice = +(t.total_amount / itemCount).toFixed(2);
    selectedProducts.forEach((p, idx) => {
      const qty = Math.floor(Math.random() * 3) + 1;
      const unitPrice = +(basePrice / qty).toFixed(2);
      itemsToInsert.push({
        transaction_id: t.id,
        product_name: p.name,
        sku: p.sku,
        quantity: qty,
        unit_price: unitPrice,
        subtotal: +(unitPrice * qty).toFixed(2)
      });
    });
  });

  const { error: itemsError } = await supabase.from("transaction_items").insert(itemsToInsert);
  if (itemsError) return { error: "Transactions created, but failed to insert items: " + itemsError.message };
  
  return { success: "Mock data generated successfully." };
}

export async function createWholesaleTransactionAction(data: {
  branchId: string;
  items: any[];
  sellerName: string;
  buyerName: string;
  totalAmount: number;
  date?: string;
}) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { error: "Unauthorized" };

  // 1. Get organization_id and branch name
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, branch_name")
    .eq("id", authData.user.id)
    .single();

  if (!profile?.organization_id) return { error: "Profile incomplete" };

  const supabaseAdmin = createAdminClient();

  const createdAt = data.date 
    ? new Date(data.date + 'T' + new Date().toTimeString().split(' ')[0]).toISOString()
    : new Date().toISOString();

  // 2. Create the transaction (Pending status)
  const { data: transaction, error: tError } = await supabaseAdmin
    .from("transactions")
    .insert({
      organization_id: profile.organization_id,
      branch_name: profile.branch_name,
      total_amount: data.totalAmount,
      payment_method: 'pending_payment',
      status: 'pending',
      seller_name: data.sellerName,
      buyer_name: data.buyerName,
      cashier_id: authData.user.id,
      cashier_name: data.sellerName, // Matches schema field
      type: 'wholesale', // Discriminator for reports
      created_at: createdAt
    })
    .select("id")
    .single();

  if (tError) {
    console.error("Transaction Error:", tError);
    return { error: "Failed to create transaction: " + tError.message };
  }

  // 3. Process items and deduct stock
  // Mapping items for bulk insert
  const itemsToInsert = data.items.map(item => ({
    transaction_id: transaction.id,
    product_id: item.id,
    product_name: item.name, // Matches schema field
    sku: item.sku,           // Matches schema field
    quantity: item.quantity,
    unit_price: item.wholesale_price,
    subtotal: item.wholesale_price * item.quantity * (item.packMultiplier || 1), // Matches schema field
    pack_type: item.packType
  }));

  const { error: itemsError } = await supabaseAdmin.from("transaction_items").insert(itemsToInsert);
  
  if (itemsError) {
    return { error: "Failed to record transaction items." };
  }

  // Deduct stock for each item
  for (const item of data.items) {
    const totalDeduction = item.quantity * (item.packMultiplier || 1);
    
    // RPC call would be better here, but doing it sequentially for now
    const { data: balance } = await supabaseAdmin
      .from("product_balances")
      .select("wholesale_qty")
      .eq("product_id", item.id)
      .eq("branch_id", data.branchId)
      .single();

    if (balance) {
      await supabaseAdmin
        .from("product_balances")
        .update({ wholesale_qty: Math.max(0, balance.wholesale_qty - totalDeduction) })
        .eq("product_id", item.id)
        .eq("branch_id", data.branchId);
    }
  }

  revalidatePath("/pos/wholesale");
  revalidatePath("/inventory");
  return { success: true, transactionId: transaction.id };
}

export async function submitDailyAuditAction() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { error: "Unauthorized" };

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from("transactions")
    .update({ is_audited: true })
    .eq("cashier_id", authData.user.id)
    .gte("created_at", startOfDay.toISOString());

  if (error) {
    console.error("Audit Error:", error);
    return { error: "Failed to submit audit: " + error.message };
  }
  
  return { success: "Daily sales submitted for audit successfully." };
}

export async function createRetailTransactionAction(
  _prevState: any,
  data: { 
    branchId: string, 
    buyerName: string, 
    sellerName: string,
    totalAmount: number,
    items: any[],
    date?: string
  }
) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) return { error: "Unauthorized" };

  // 1. Get organization_id and branch name from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, branch_name")
    .eq("id", authData.user.id)
    .single();

  if (!profile?.organization_id) return { error: "Profile incomplete" };

  const supabaseAdmin = createAdminClient();

  const createdAt = data.date 
    ? new Date(data.date + 'T' + new Date().toTimeString().split(' ')[0]).toISOString()
    : new Date().toISOString();

  // 2. Create the transaction (Pending status)
  const { data: transaction, error: tError } = await supabaseAdmin
    .from("transactions")
    .insert({
      organization_id: profile.organization_id,
      branch_name: profile.branch_name,
      total_amount: data.totalAmount,
      payment_method: 'pending_payment',
      status: 'pending',
      seller_name: data.sellerName,
      buyer_name: data.buyerName,
      cashier_id: authData.user.id,
      cashier_name: data.sellerName, 
      type: 'retail', // Discriminator for reports
      created_at: createdAt
    })
    .select("id")
    .single();

  if (tError) {
    console.error("Transaction Error:", tError);
    return { error: "Failed to create transaction: " + tError.message };
  }

  // 3. Process items and deduct stock
  const itemsToInsert = data.items.map(item => ({
    transaction_id: transaction.id,
    product_id: item.id,
    product_name: item.name,
    sku: item.sku,
    quantity: item.quantity,
    unit_price: item.retail_price,
    subtotal: item.retail_price * item.quantity, 
  }));

  const { error: itemsError } = await supabaseAdmin.from("transaction_items").insert(itemsToInsert);
  
  if (itemsError) {
    return { error: "Failed to record transaction items." };
  }

  // Deduct stock for each item from RETAIL bucket
  for (const item of data.items) {
    const { data: balance } = await supabaseAdmin
      .from("product_balances")
      .select("retail_qty")
      .eq("product_id", item.id)
      .eq("branch_id", data.branchId)
      .single();

    if (balance) {
      await supabaseAdmin
        .from("product_balances")
        .update({ retail_qty: Math.max(0, balance.retail_qty - item.quantity) })
        .eq("product_id", item.id)
        .eq("branch_id", data.branchId);
    }
  }

  revalidatePath("/pos/retail");
  revalidatePath("/inventory");
  return { success: true, transactionId: transaction.id };
}

export async function createSupermarketTransactionAction(
  _prevState: any,
  data: { 
    branchId: string, 
    buyerName: string, 
    sellerName: string,
    totalAmount: number,
    items: any[],
    date?: string
  }
) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, branch_name")
    .eq("id", authData.user.id)
    .single();

  if (!profile?.organization_id) return { error: "Profile incomplete" };

  const supabaseAdmin = createAdminClient();

  const createdAt = data.date 
    ? new Date(data.date + 'T' + new Date().toTimeString().split(' ')[0]).toISOString()
    : new Date().toISOString();

  // Create the transaction (Completed immediately for supermarket)
  const { data: transaction, error: tError } = await supabaseAdmin
    .from("transactions")
    .insert({
      organization_id: profile.organization_id,
      branch_name: profile.branch_name,
      total_amount: data.totalAmount,
      payment_method: 'cash',
      status: 'completed',
      seller_name: data.sellerName,
      buyer_name: data.buyerName,
      cashier_id: authData.user.id,
      cashier_name: data.sellerName, 
      type: 'supermarket',
      created_at: createdAt
    })
    .select("id")
    .single();

  if (tError) return { error: "Failed to create transaction: " + tError.message };

  // Mapping items for bulk insert
  const itemsToInsert = data.items.map(item => ({
    transaction_id: transaction.id,
    product_id: item.id,
    product_name: item.name,
    sku: item.sku,
    quantity: item.quantity,
    unit_price: item.supermarket_price,
    subtotal: item.supermarket_price * item.quantity,
  }));

  const { error: itemsError } = await supabaseAdmin.from("transaction_items").insert(itemsToInsert);
  if (itemsError) return { error: "Failed to record items." };

  // Deduct stock from SUPERMARKET bucket
  for (const item of data.items) {
    const { data: balance } = await supabaseAdmin
      .from("product_balances")
      .select("supermarket_qty")
      .eq("product_id", item.id)
      .eq("branch_id", data.branchId)
      .single();

    if (balance) {
      await supabaseAdmin
        .from("product_balances")
        .update({ supermarket_qty: Math.max(0, balance.supermarket_qty - item.quantity) })
        .eq("product_id", item.id)
        .eq("branch_id", data.branchId);
    }
  }

  revalidatePath("/pos/cashier");
  revalidatePath("/inventory");
  return { success: true, transactionId: transaction.id };
}

export async function collectPaymentAction(transactionId: string) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { error: "Unauthorized" };

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from("transactions")
    .update({ 
      status: 'completed'
    })
    .eq("id", transactionId);

  if (error) return { error: "Failed to collect payment: " + error.message };
  
  revalidatePath("/pos/cashier");
  return { success: "Payment collected successfully." };
}

export async function clearDailyAuditAction(targetStaffId: string) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { error: "Unauthorized" };

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from("transactions")
    .update({ 
      is_cleared: true,
      cleared_at: new Date().toISOString(),
      cleared_by: authData.user.id
    })
    .eq("cashier_id", targetStaffId)
    .eq("is_audited", true)
    .eq("is_cleared", false)
    .gte("created_at", startOfDay.toISOString());

  if (error) return { error: "Failed to clear audit: " + error.message };
  
  revalidatePath("/pos/cashier");
  return { success: "Staff audit cleared successfully." };
}

export async function checkAuditStatusAction() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { hasSales: false, isAudited: false };

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Check if there are ANY sales today
  const { data: sales } = await supabase
    .from("transactions")
    .select("id, is_audited")
    .eq("cashier_id", authData.user.id)
    .gte("created_at", startOfDay.toISOString());

  if (!sales || sales.length === 0) return { hasSales: false, isAudited: false };

  const isAllAudited = sales.every(s => s.is_audited);
  return { hasSales: true, isAudited: isAllAudited };
}
