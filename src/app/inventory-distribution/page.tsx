import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import DistributionClient from "./DistributionClient";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function InventoryDistributionPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData?.user) {
    redirect("/login");
  }

  // Fetch organization_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", authData.user.id)
    .single();

  if (!profile?.organization_id) {
    return <div>Profile setup incomplete.</div>;
  }

  // Fetch products
  const { data: products } = await supabase
    .from("products")
    .select("id, name, sku, quantity")
    .eq("organization_id", profile.organization_id)
    .order("name");

  // Fetch branches created by this admin OR in their organization
  const { data: branches } = await supabase
    .from("branches")
    .select("*")
    .or(`admin_id.eq.${authData.user.id}${profile?.organization_id ? `,organization_id.eq.${profile.organization_id}` : ''}`)
    .order("branch_name");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 sm:p-12 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute top-[50%] -right-[5%] w-[30%] h-[30%] rounded-full bg-emerald-500/10 blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        <div className="pt-4" />

        <DistributionClient initialProducts={products || []} branches={branches || []} />
      </div>
    </div>
  );
}
