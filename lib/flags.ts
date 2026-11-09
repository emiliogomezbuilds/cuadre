// Week 12 scope cut (docs/PACKET_W12.md, section 10): the AI proposal screens, the label-photo reader and
// the simulated supplier feed were all hidden behind one flag, CORE_ONLY. This week's five real-user
// sessions found the paste-text screen is the fix the #1 pain (double-entry) needs, but the photo reader
// and the simulated feed are still unproven — so the single flag is split into three, independently
// switchable, each enforced server-side in app/actions.ts (never only hidden in the UI; see DECISIONS.md,
// "Mechanical test pass," 1 Nov 2026, for why a UI-only gate is not a real gate).
export const AI_TEXT_ENABLED = true; // paste-text AI-propose screen: re-enabled this week (docs/PACKET.md, section 4)
export const AI_PHOTO_ENABLED = false; // label-photo reader: stays off, unproven, not this week's fix
export const SIM_FEED_ENABLED = false; // simulated supplier feed: stays off, same reason
