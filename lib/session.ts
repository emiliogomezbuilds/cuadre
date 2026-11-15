import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Every protected page goes through here. No session -> /login.
// RLS still enforces ownership in the database, this is only the friendly redirect.
export async function requireUser() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  return { supabase, user: auth.user };
}

// For public pages (Week 14: /pricing) that show extra content when signed in, but must not redirect an
// anonymous visitor away — a prospective payer should be able to see prices without logging in first.
export async function optionalUser() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  return { supabase, user: auth.user ?? null };
}

export type Purpose = "process_data" | "ai_text" | "ai_image";
export const CONSENT_VERSION = "2026-10-v1";
