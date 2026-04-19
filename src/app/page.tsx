import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import AdminDashboardClient from "./AdminDashboardClient";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData?.user) {
    redirect("/login");
  }

  // Fetch role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  if (profile?.role?.toString().toLowerCase() === "pharmacist") {
    redirect("/pos/wholesale");
  }

  if (profile?.role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mb-6 border border-red-500/20">
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m13 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h1 className="text-white text-4xl font-black mb-4 tracking-tight">Access Denied</h1>
        <p className="text-slate-400 max-w-md text-lg">
          Your account role (<span className="text-indigo-400 font-mono font-bold uppercase">{profile?.role || 'unknown'}</span>) does not have permission to access the admin dashboard.
        </p>
      </div>
    );
  }

  const { data: branches } = await supabase
    .from("branches")
    .select("branch_name")
    .eq("admin_id", authData.user.id)
    .order("branch_name");

  const branchNames = branches ? branches.map((b) => b.branch_name) : [];

  return <AdminDashboardClient branches={branchNames} />;
}
