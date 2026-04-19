import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import WholesalePOSClient from "./WholesalePOSClient";

export default async function WholesalePOSPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData?.user) {
    redirect("/login");
  }

  // Fetch profile to get branch name
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, organization_id")
    .eq("id", authData.user.id)
    .single();

  if (profile?.role?.toString().toLowerCase() !== "pharmacist") {
    redirect("/");
  }

  if (!profile?.organization_id) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center text-white">
        <h1 className="text-2xl font-bold mb-4">Organization Error</h1>
        <p className="text-slate-400">Your account is not linked to an organization. Please contact your admin.</p>
      </div>
    );
  }

  // Fetch branch ID from branch_name
  const { data: branch } = await supabase
    .from("branches")
    .select("id, branch_name")
    .eq("branch_name", profile.branch_name)
    .eq("organization_id", profile.organization_id)
    .single();

  if (!branch) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-white text-3xl font-black mb-4 tracking-tighter">Branch Error</h1>
        <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl max-w-md">
          <p className="text-slate-400 leading-relaxed">
            Could not find branch: <span className="text-indigo-400 font-mono font-bold">{profile.branch_name}</span> in your organization.
          </p>
          <p className="mt-4 text-sm text-slate-500 italic">
            Tip: Verify that the branch name in your profile exactly matches the branch name in the admin dashboard.
          </p>
        </div>
      </div>
    );
  }

  // Fetch products and their balances for this specific branch
  const { data: products } = await supabase
    .from("products")
    .select(`
      *,
      product_balances (*)
    `)
    .eq("organization_id", profile.organization_id);

  // Filter products that have a balance record for this branch
  const branchProducts = (products || []).map(p => ({
    ...p,
    branch_stock: p.product_balances?.find((pb: any) => pb.branch_id === branch.id)
  })).filter(p => p.branch_stock);

  return (
    <WholesalePOSClient 
      initialProducts={branchProducts} 
      branchName={branch.branch_name}
      branchId={branch.id}
      userProfile={profile}
    />
  );
}
