import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import SalesAuditClient from "./SalesAuditClient";
import { getSalesDataAction } from "../actions";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function SalesAuditPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData?.user) {
    redirect("/login");
  }

  // Fetch admin profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", authData.user.id)
    .single();

  // Fetch branches for filter
  const { data: branches } = await supabase
    .from("branches")
    .select("branch_name")
    .eq("organization_id", profile?.organization_id || "")
    .order("branch_name");

  // Fetch sales data
  const { transactions, error } = await getSalesDataAction();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 sm:p-12 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[50%] rounded-full bg-blue-600/10 blur-[130px]" />
        <div className="absolute bottom-0 right-0 w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[130px]" />
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
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-sm font-bold flex items-center gap-3 animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            Error loading transactions: {error}
          </div>
        )}
        <SalesAuditClient 
          initialTransactions={transactions || []} 
          branches={branches?.map(b => b.branch_name) || []} 
        />
      </div>
    </div>
  );
}
