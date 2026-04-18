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

  // Fetch products and their balances
  const { data: products, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      sku,
      quantity,
      product_balances (
        wholesale_qty,
        retail_qty,
        supermarket_qty
      )
    `)
    .eq("organization_id", profile.organization_id)
    .order("name");

  if (error) {
    console.error("Error fetching inventory:", error);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 sm:p-12 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute top-[50%] -right-[5%] w-[30%] h-[30%] rounded-full bg-emerald-500/10 blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        <header>
          <Link href="/" className="text-slate-500 hover:text-indigo-400 flex items-center gap-1 text-sm transition-colors mb-4 group w-fit">
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
          </Link>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-emerald-400">
            Inventory Distribution
          </h1>
          <p className="mt-2 text-slate-400 text-lg">
            Allocate stock from the main warehouse to your specific pharmacy channels.
          </p>
        </header>

        <DistributionClient initialProducts={products || []} />
      </div>
    </div>
  );
}
