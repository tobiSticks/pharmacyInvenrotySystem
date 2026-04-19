import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import RetailPOSClient from "./RetailPOSClient";

export default async function RetailPOSPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData?.user) {
    redirect("/login-staff");
  }

  // Fetch staff profile with organization and branch details
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, organizations(name)")
    .eq("id", authData.user.id)
    .single();

  if (!profile || !profile.branch_name) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900/50 border border-slate-800 p-8 rounded-3xl text-center shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/10 rounded-2xl border border-rose-500/20 flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl text-rose-500 font-bold">!</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Branch Error</h1>
          <p className="text-slate-400">Could not find branch: <span className="text-slate-200 font-bold">{profile?.branch_name || "Unassigned"}</span>. Please contact your admin.</p>
        </div>
      </div>
    );
  }

  // Fetch branch details to get ID
  const { data: branch } = await supabase
    .from("branches")
    .select("id")
    .eq("branch_name", profile.branch_name)
    .eq("organization_id", profile.organization_id)
    .single();

  if (!branch) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2 text-rose-400">Branch Configuration Missing</h1>
          <p className="text-slate-400">The branch "{profile.branch_name}" is not properly configured in our records.</p>
        </div>
      </div>
    );
  }

  // Fetch inventory specifically for this branch from product_balances
  // We join with products to get the names and prices
  const { data: inventory, error: invError } = await supabase
    .from("product_balances")
    .select(`
      retail_qty,
      products (
        id,
        name,
        sku,
        retail_price,
        category_name,
        product_form
      )
    `)
    .eq("branch_id", branch.id);

  if (invError) {
    console.error("Inventory Fetch Error:", invError);
  }

  // Flatten the data for the client component
  const products = inventory?.map(item => ({
    ...(item.products as any),
    retail_qty: item.retail_qty
  })).filter(p => p.retail_qty > 0) || [];

  return (
    <RetailPOSClient 
      initialProducts={products} 
      branchName={profile.branch_name}
      branchId={branch.id}
      userProfile={profile}
    />
  );
}
