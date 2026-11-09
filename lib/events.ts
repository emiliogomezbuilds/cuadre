// Week 13's minimal event log (docs/PACKET.md, section 4; w13.5_ship.html's stack-floor requirement:
// "Same stack + an analytics/feedback mechanism, even a simple event log"). Not a dashboard, not analytics
// in the marketing sense — just a durable, append-only record that a key action happened, by whom, and
// when. RLS scopes every row to its own user (supabase/schema.sql, "events").
//
// Logging is best-effort: a failure to log never blocks or fails the action it is recording. The action
// itself is the thing that matters; the log is a record of it, not a precondition for it.
import type { SupabaseClient } from "@supabase/supabase-js";

export type EventAction = "cycle_created" | "file_imported" | "exception_decided" | "cycle_approved" | "export_downloaded";

export async function logEvent(
  supabase: SupabaseClient,
  userId: string,
  action: EventAction,
  cycleId: string | null,
  detail?: string
): Promise<void> {
  try {
    await supabase.from("events").insert({
      user_id: userId,
      cycle_id: cycleId,
      action,
      detail: detail ? detail.slice(0, 200) : null,
    });
  } catch {
    // best-effort: never let a logging failure surface as a user-facing error
  }
}
