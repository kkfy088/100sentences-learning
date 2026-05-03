import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url === "your_supabase_project_url" || key === "your_supabase_anon_key") {
    return null;
  }

  try {
    supabaseClient = createClient(url, key);
    return supabaseClient;
  } catch {
    return null;
  }
}

export const supabase = getSupabaseClient();

export const isSupabaseConfigured = (): boolean => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!(url && key && url !== "your_supabase_project_url" && key !== "your_supabase_anon_key");
};
