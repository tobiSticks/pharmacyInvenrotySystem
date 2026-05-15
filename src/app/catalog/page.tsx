import { createClient } from "@/utils/supabase/server";
import { fetchAllProducts } from "@/utils/supabase/queries";
import { redirect } from "next/navigation";
import CatalogClient from "./CatalogClient";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function CatalogPage() {
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
  let products: any[] = [];
  try {
    products = await fetchAllProducts(
      supabase,
      profile.organization_id,
      "id, name, sku, wholesale_price, retail_price, supermarket_price, quantity"
    );
  } catch (error) {
    console.error("Error fetching catalog:", error);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 sm:p-12 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[50%] rounded-full bg-rose-600/10 blur-[130px]" />
        <div className="absolute bottom-0 right-0 w-[30%] h-[40%] rounded-full bg-orange-500/10 blur-[110px]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10 w-full">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition-colors group mb-8"
        >
          <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl group-hover:bg-slate-800 transition-all">
            <ChevronLeft size={20} />
          </div>
          <span className="text-xs font-black uppercase tracking-widest">Back to Dashboard</span>
        </Link>
        <CatalogClient initialProducts={products || []} />
      </div>
    </div>
  );
}
