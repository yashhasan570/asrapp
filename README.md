# Asr — Study Schedule Engine

> This repo intentionally holds **no code**. One working prototype existed here and was removed on purpose. This file is the whole deliverable for now: what we want to build, and why it would help students greatly.

## The problem

Bangladeshi students — SSC, HSC, admission candidates — juggle four kinds of commitments every week: school exams, coaching classes, private tuition, and self-study. Each has its own day and time. The schedule lives in messy notebooks, forwarded Telegram messages, and memory.

The consequences are predictable:

- **Double-bookings found out too late.** Coaching 6–8pm collides with an exam prep block, and the student discovers it when it is already too late to fix.
- **No buffers.** Plans get written back-to-back with zero minutes for travel, food, or rest — so the whole day collapses on the first delay.
- **No feedback.** Nobody tracks whether the plan actually happened. Unrealistic schedules get repeated indefinitely, and the result is guilt instead of adjustment.

## What we want to build

An offline-first, installable web app (PWA) that opens in two seconds on a cheap phone:

1. **Time blocks, not to-dos.** Every commitment has a type (Exam / Coaching / Private / Self-study), a date, and a start–end time.
2. **Conflict safety.** Hard block on overlapping times. Warning when the gap between two blocks drops below ~30 minutes (travel, eat, rest) — checked in both directions, not just one.
3. **Day timeline.** A chronological view of any date: what the day actually looks like, not what we wished it looked like.
4. **Completion analytics.** Tick off what really happened. Daily score plus a 7-day trend, so patterns surface ("my Wednesdays always collapse").
5. **Zero-friction import.** Paste a JSON payload of the coaching routine once and the whole schedule populates.

## Why students would be greatly helped

- **Fewer missed classes and exams.** Overlap warnings catch double-bookings *before* they happen instead of after. That is the single highest-value feature here — it prevents a loss rather than measuring one.
- **Realistic days instead of aspirational ones.** Buffer warnings force thinking about travel and rest, not only study hours. A plan that survives contact with reality beats an ambitious plan that does not.
- **An honest feedback loop.** Completion scoring shows which plans are fantasy, so the schedule adapts to the student instead of the student failing the schedule. Data replaces guilt.
- **Works on a bad connection and a budget phone.** No login, no backend, no accounts, no telemetry — everything stays in device storage. This matters specifically because the users are minors: privacy is not a compliance checkbox here, it is the design.
- **Installs like a native app** without Play Store friction, updates silently, keeps working offline.

## Product principles

- Mobile-first, one-hand usable, dark mode default.
- Opens instantly. No onboarding wall, no account, no paywall.
- The data belongs to the student: plain-JSON export and import, always.
- Bengali and English from day one, not bolted on later.

## Technical direction (a suggestion, not a mandate)

- Static SPA. Contributing must not require a build step.
- Service worker for offline shell + installability; version-pinned dependencies with SRI hashes.
- Compute "today" in the **device timezone** — never `toISOString()`, which is UTC.
- Validate at every boundary: JSON imports, storage reads, form input. Corrupt stored data must degrade gracefully, never crash the app at boot.
- Delete a task and prune its checklist/score entries, or device storage grows forever.

## Traps worth recording (learned from the prototype that lived here)

These cost real debugging time and are cheap to avoid up front:

- AI-generated front-end code ships markdown-mangled CDN URLs (`src="[https://…](https://…)"`) and JS template literals inside framework templates (`${ x }` where `{{ x }}` belongs). Both are invisible until you open the page — ten seconds in a real browser catches both.
- An event handler referenced in a template but not returned from `setup()` fails **silently**. The feature looks complete, ships, and never persists anything. This was the worst bug in the prototype: the analytics tab appeared to work and lost every tick on reload.
- UTC date math flips "today" at 18:00 local in UTC+6. The nightly checklist empties and the chart zeroes out, with no error anywhere.
- A CDN "play" script for a CSS framework is officially dev-only. Fine for a spike, wrong for something students install.

## Status

- [ ] Decide: no-build SPA, or Vite + Tailwind from the start
- [ ] Block model + conflict engine (two-way buffer check)
- [ ] Timeline view
- [ ] Completion scoring + 7-day trend
- [ ] BN/EN i18n
- [ ] Icons, manifest, service worker — a real PWA, not just a manifest stub
- [ ] Bengali UI pass with actual students before any polish work

---

*The prototype that was here — a Vue 3 app of roughly 350 lines, verified end-to-end in a headless browser and deployed live — proved the concept runs and that students' scheduling pain is real and tractable. The code was removed so this project restarts from intent rather than inherited scaffolding. Everything remains recoverable from git history (`git log main`).*