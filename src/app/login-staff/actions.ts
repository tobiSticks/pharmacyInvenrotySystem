"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function loginAction(prevState: unknown, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const branchName = formData.get("branchName") as string;

  if (!email || !password || !branchName) {
    return { error: "All fields are required." };
  }

  const supabase = await createClient();

  // 1. Authenticate user
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    return { error: authError?.message || "Invalid email or password." };
  }

  // 2. Fetch the profile details (including role)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("branch_name, role")
    .eq("id", authData.user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return { error: "Profile not found. Please contact an administrator." };
  }

  // 3. Verify branch_name (Case-insensitive check for better UX)
  if (profile.branch_name?.toLowerCase().trim() !== branchName.toLowerCase().trim()) {
    await supabase.auth.signOut();
    return { error: "You are not assigned to this branch. Please contact your admin." };
  }

  // 4. Role-based redirection
  const userRole = profile.role?.toString().toLowerCase();
  
  if (userRole === "pharmacist") {
    redirect("/pos/wholesale");
  }

  // Default redirect for other roles
  redirect("/");
}
