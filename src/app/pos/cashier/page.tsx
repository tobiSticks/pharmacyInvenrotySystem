import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { fetchAllRows } from "@/utils/supabase/queries";
import { redirect } from "next/navigation";
import CashierDashboardClient from "./CashierDashboardClient";

export default async function CashierPOSPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData?.user) {
    redirect("/login-staff");
  }

  // Fetch cashier profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, organizations(name)")
    .eq("id", authData.user.id)
    .single();

  if (!profile || !profile.branch_name) {
    redirect("/");
  }

  // Fetch branch ID
  const { data: branch } = await supabase
    .from("branches")
    .select("id")
    .eq("branch_name", profile.branch_name)
    .eq("organization_id", profile.organization_id)
    .single();

  if (!branch) {
    redirect("/");
  }

  const supabaseAdmin = createAdminClient();

  // 1. Fetch Supermarket Inventory
  let inventory: any[] = [];
  try {
    inventory = await fetchAllRows(
      supabase,
      "product_balances",
      `
        supermarket_qty,
        products (
          id,
          name,
          sku,
          supermarket_price,
          category_name,
          product_form
        )
      `,
      "branch_id",
      branch.id
    );
  } catch (error) {
    console.error("Inventory Fetch Error:", error);
  }

  const products = inventory?.map(item => ({
    ...(item.products as any),
    supermarket_qty: item.supermarket_qty
  })).filter(p => p.supermarket_qty > 0) || [];

  // 2. Fetch Pending Payments (Status: pending)
  const { data: pendingPayments } = await supabaseAdmin
    .from("transactions")
    .select(`
      *,
      transaction_items (*)
    `)
    .eq("branch_name", profile.branch_name)
    .eq("organization_id", profile.organization_id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  // 3. Fetch Submitted Audits (is_audited: true, is_cleared: false)
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data: submittedAudits } = await supabaseAdmin
    .from("transactions")
    .select(`
      id,
      cashier_id,
      cashier_name,
      total_amount,
      created_at,
      transaction_items (*)
    `)
    .eq("branch_name", profile.branch_name)
    .eq("organization_id", profile.organization_id)
    .eq("is_audited", true)
    .eq("is_cleared", false)
    .gte("created_at", startOfDay.toISOString());

  // Group audits by staff member and itemize products
  const auditGroups: any = {};
  submittedAudits?.forEach((a: any) => {
    const staffId = a.cashier_id;
    if (!auditGroups[staffId]) {
      auditGroups[staffId] = {
        staffId: staffId,
        staffName: a.cashier_name || "Unknown Staff",
        totalSales: 0,
        transactionCount: 0,
        lastActivity: a.created_at,
        itemList: {} // SKU -> { name, qty, total }
      };
    }
    
    const group = auditGroups[staffId];
    group.totalSales += Number(a.total_amount);
    group.transactionCount += 1;
    if (new Date(a.created_at) > new Date(group.lastActivity)) {
      group.lastActivity = a.created_at;
    }

    // Aggregate items
    a.transaction_items?.forEach((item: any) => {
      if (!group.itemList[item.sku]) {
        group.itemList[item.sku] = { 
          name: item.product_name, 
          qty: 0, 
          total: 0,
          unit_price: item.unit_price 
        };
      }
      group.itemList[item.sku].qty += item.quantity;
      group.itemList[item.sku].total += Number(item.subtotal);
    });
  });

  // Convert itemList objects to arrays for easier iterating in client
  const finalAuditSubmissions = Object.values(auditGroups).map((group: any) => ({
    ...group,
    items: Object.values(group.itemList)
  }));

  return (
    <CashierDashboardClient 
      initialProducts={products} 
      branchName={profile.branch_name}
      branchId={branch.id}
      userProfile={profile}
      pendingPayments={pendingPayments || []}
      auditSubmissions={finalAuditSubmissions}
    />
  );
}
