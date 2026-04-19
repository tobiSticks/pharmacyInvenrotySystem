import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import SalesAuditClient from "./SalesAuditClient";
import { getSalesDataAction } from "../actions";

export default async function SalesAuditPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData?.user) {
    redirect("/login");
  }

  // Fetch branches for filter
  const { data: branches } = await supabase
    .from("branches")
    .select("name")
    .order("name");

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
        <SalesAuditClient 
          initialTransactions={transactions || []} 
          branches={branches?.map(b => b.name) || []} 
        />
      </div>
    </div>
  );
}
