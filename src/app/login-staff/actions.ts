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
    return { error: "Invalid email or password." };
  }

  // 2. Fetch the profile details
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("branch_name")
    .eq("id", authData.user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return { error: "Profile not found. Please contact an administrator." };
  }

  // 3. Verify branch_name (case sensitive or insensitive based on setup, here we'll do exact string match)
  if (profile.branch_name !== branchName) {
    await supabase.auth.signOut();
    return { error: "Access Denied: You are not assigned to this branch." };
  }

  // 4. On success, Next.js redirect must be returned or called outside try-catch
  redirect("/");
}
