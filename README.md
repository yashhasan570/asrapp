# Asr — study schedule engine

A small offline-first SPA for planning exam / coaching / private / self-study
blocks, warning about overlaps, and tracking daily completion.

No backend, no build step, no accounts: everything lives in `localStorage`.

## Features

- **Manager** — add/edit/delete time blocks (title, classification, date, start, end) and bulk-import them from a JSON payload.
- **Conflict safety** — hard error on overlapping blocks, warning when the buffer between two blocks drops below 30 minutes (checked in both directions).
- **Timeline** — day-by-day chronological view of the schedule.
- **Brain** — tick off the day's tasks, compile a completion score, and see a 7-day trend line.
- **Dark / light theme**, installable as a PWA, works offline.

## Run it

```bash
git clone https://github.com/yashhasan570/asrapp.git
cd asrapp
python -m http.server 8080
# open http://localhost:8080/index.html
```

Opening `index.html` straight from disk also works, but the service worker and
PWA install only register over `http(s)` (localhost or a hosted origin).

## Layout

```text
index.html              markup + Vue templates
assets/css/style.css    glass-panel theme overrides
assets/js/engine.js     helpers: time math, local dates, task validation, feedback copy
assets/js/app.js        Vue 3 app: state, computed views, localStorage persistence
sw.js                   service worker (app-shell precache, offline fallback)
manifest.json           PWA manifest
assets/icons/           generated icon set (see scripts/gen_icons.py)
scripts/gen_icons.py    stdlib-only PNG generator for the icon set
```

## Data shape

```json
{
  "id": "item_1792078419934_jdu36",
  "title": "Physics Exam",
  "type": "Exam | Coaching | Private | Self",
  "date": "YYYY-MM-DD",
  "startTime": "HH:MM",
  "endTime": "HH:MM"
}
```

Storage keys: `asr_routines`, `asr_checklist`, `asr_scores`, `asr_theme`.
Corrupt values are dropped on boot instead of crashing the app.

## Notes / limits

- Tailwind is loaded from its CDN play script, which is officially a
  development-only tool. A real build step (Vite + Tailwind, or plain CSS)
  belongs here before this goes anywhere important.
- Vue, Chart.js and Font Awesome are version-pinned; three of the four carry
  SRI hashes (the Tailwind CDN does not serve a stable hashed asset).
- Analytics feedback is rendered with `v-html`. The strings are local
  constants today; if that ever becomes remote data, sanitise it first.
- Regenerate icons with `python scripts/gen_icons.py assets/icons`.

## License

MIT — see [LICENSE](LICENSE).