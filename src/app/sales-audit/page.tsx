import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import SalesAuditClient from "./SalesAuditClient";
import { getSalesDataAction } from "../actions";
import Link from "next/link";
import { ChevronLeft, AlertCircle } from "lucide-react";

export default async function SalesAuditPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData?.user) {
    redirect("/login");
  }

  // Fetch admin profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (!profile?.organization_id) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center text-slate-100">
        <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-6 border border-amber-500/20 text-amber-400">
          <AlertCircle size={32} />
        </div>
        <h1 className="text-3xl font-extrabold mb-3">Profile Setup Incomplete</h1>
        <p className="text-slate-400 max-w-md text-sm mb-6">
          Your account is logged in as <span className="text-white font-mono font-bold">{authData.user.email}</span>, but your profile has not been assigned to an organization.
        </p>
        <Link 
          href="/" 
          className="px-6 py-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xl"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // Fetch branches for filter
  const { data: branches } = await supabase
    .from("branches")
    .select("branch_name")
    .eq("organization_id", profile?.organization_id || "")
    .order("branch_name");

  // Fetch sales data
  const { transactions, analytics, totalCount, error } = await getSalesDataAction();

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
          initialAnalytics={analytics}
          totalCount={totalCount || 0}
          branches={branches?.map(b => b.branch_name) || []} 
        />
      </div>
    </div>
  );
}
