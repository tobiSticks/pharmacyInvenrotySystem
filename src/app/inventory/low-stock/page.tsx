import { redirect } from "next/navigation";
import { getLowStockDataAction } from "../../actions";
import LowStockClient from "./LowStockClient";
import Link from "next/link";
import { ChevronLeft, AlertCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/server";

export default async function LowStockPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData?.user) {
    redirect("/login");
  }

  // Fetch low stock data using server action
  const { branches = [], products = [], error } = await getLowStockDataAction();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-amber-600/10 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[100px]" />
      </div>

      <div className="flex-1 h-screen overflow-y-auto pt-12 pb-24 px-4 sm:px-12 relative z-10 custom-scrollbar w-full">
        <div className="max-w-7xl mx-auto w-full space-y-6">
          
          {/* Header & Back Action */}
          <header className="space-y-4">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition-colors group"
            >
              <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl group-hover:bg-slate-800 transition-all">
                <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest">Back to Dashboard</span>
            </Link>

            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-sm font-bold flex items-center gap-3 animate-pulse">
                <AlertCircle size={20} />
                <span>Error loading alerts data: {error}</span>
              </div>
            )}
          </header>

          {/* Interactive Client Section */}
          <LowStockClient initialProducts={products} branches={branches} />
        </div>
      </div>
    </div>
  );
}
