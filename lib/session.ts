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

export type Purpose = "process_data" | "ai_text" | "ai_image";
export const CONSENT_VERSION = "2026-10-v1";
