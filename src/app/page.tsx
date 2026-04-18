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

  if (profile?.role !== "admin") {
    // If a staff somehow gets here, they shouldn't see it
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
        <h1 className="text-white text-3xl">Access Denied. Admins Only.</h1>
      </div>
    );
  }

  const { data: branches } = await supabase
    .from("branches")
    .select("name")
    .eq("admin_id", authData.user.id)
    .order("name");

  const branchNames = branches ? branches.map((b) => b.name) : [];

  return <AdminDashboardClient branches={branchNames} />;
}
