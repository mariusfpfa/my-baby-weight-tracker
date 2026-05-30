# My Baby Weight Tracker

A small single-page baby weight tracker that plots measurements against WHO percentile curves.

## Features

- Baby profile: name, birth date, gender, kg or lbs/oz
- Weight measurements with validation
- WHO percentile chart for boys/girls
- Dark/light mode
- Persistent browser storage via `localStorage`
- CSV import/export for measurements
- Full JSON backup/restore for baby info + measurements

## Storage / persistence

The app stores data in the browser under `localStorage` key `babyWeightTracker:v2`. This persists after refreshes, browser restarts, and Netlify redeploys on the same device/browser.

For moving data to another phone/browser, use:

- `💾` = export full JSON backup
- `♻️` = restore full JSON backup
- `📤` / `📥` = CSV export/import of measurements only

If you later want real cross-device sync, the next small step is adding Supabase/Firebase auth + database.

## Local development

```bash
npm install
npm run dev
```

Then open the printed localhost URL.

## Deploy

This is a static app. It can be deployed to Netlify, Vercel, Cloudflare Pages, or GitHub Pages.

Netlify settings:

- Build command: none
- Publish directory: `.`
