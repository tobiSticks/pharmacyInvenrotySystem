import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // If we're during a build/prerender and env vars are missing, 
    // return a placeholder to prevent crashing the entire build.
    console.warn("Supabase environment variables are missing. Using a fallback for prerendering.");
    return createBrowserClient(
      "https://placeholder-url.supabase.co",
      "placeholder-key"
    );
  }

  return createBrowserClient(url, anonKey);
}
