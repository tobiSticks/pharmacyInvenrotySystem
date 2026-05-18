"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function adminLoginAction(prevState: unknown, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
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

  // 2. Verify admin status
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    await supabase.auth.signOut();
    return { error: "Access Denied: You do not have admin privileges." };
  }

  // 3. Success
  redirect("/");
}
