import { createClient } from "@/utils/supabase/server";
import { fetchAllProducts } from "@/utils/supabase/queries";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, PackageSearch } from "lucide-react";
import InventoryListClient from "./InventoryListClient";

export default async function InventoryListPage() {
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
      "*"
    );
  } catch (error) {
    console.error("Error fetching inventory list:", error);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 sm:p-12 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] rounded-full bg-slate-600/10 blur-[120px]" />
        <div className="absolute top-[50%] -right-[5%] w-[30%] h-[30%] rounded-full bg-indigo-500/10 blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        <header>
          <Link href="/" className="text-slate-500 hover:text-indigo-400 flex items-center gap-1 text-sm transition-colors mb-4 group w-fit">
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-500/30 text-indigo-400">
              <PackageSearch size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                Warehouse Stock
              </h1>
              <p className="mt-2 text-slate-400 text-lg">
                View all imported products currently residing in the main warehouse.
              </p>
            </div>
          </div>
        </header>

        <InventoryListClient products={products || []} />
      </div>
    </div>
  );
}

