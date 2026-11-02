// Week 12 scope cut (docs/PACKET.md, section 10): the AI proposal screens, the label-photo reader and the
// simulated supplier feed are hidden behind this flag and out of the navigation. The code and its tests stay
// in the repo and keep passing; nothing beyond the core feature is reachable from the UI this week.
export const CORE_ONLY = true;
