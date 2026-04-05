# ΑΕΤ Apparel Store — Setup Guide

A lightweight brothers-only merch storefront.

## File Overview

```
apparel-store/
  index.html   — Single page with gate + store views
  style.css    — All styles (purple/gold brand colors)
  config.js    — ⚠️  Fill this in before deploying
  auth.js      — Brother name gate (Supabase lookup)
  store.js     — Loads and renders apparel items
  order.js     — Modal + email notifications (EmailJS)
```

---

## Step 1 — Fill in config.js

Open `config.js` and replace every placeholder:

| Key | Where to find it |
|-----|-----------------|
| `SUPABASE_URL` | Supabase project → Settings → API |
| `SUPABASE_ANON_KEY` | Supabase project → Settings → API |
| `BROTHERS_TABLE` | Your Supabase table name (e.g. `brothers`) |
| `BROTHERS_COLUMN` | Column holding full names (e.g. `full_name`) |
| `NOTIFY_EMAIL` | Your email for purchase notifications |
| `EMAILJS_*` | See Step 3 below |

---

## Step 2 — Supabase: Brothers Table

Make sure your Supabase table has at minimum:

```sql
create table brothers (
  id uuid default gen_random_uuid() primary key,
  full_name text not null
);
```

The auth gate does a **case-insensitive** (`ilike`) match on the name entered.

**Row-Level Security**: Enable RLS and add a policy that allows anonymous `SELECT` on this table (the anon key is used for read-only lookups):

```sql
create policy "Public can read brother names"
on brothers for select using (true);
```

---

## Step 3 — EmailJS (free, no backend)

1. Sign up at [emailjs.com](https://emailjs.com)
2. Add a service → connect your Gmail
3. Create a template. Paste this as the body:

```
Brother interest notification:

Brother: {{brother_name}}
Item: {{item_name}} ({{item_type}})
Size: {{size}}
Price: {{item_price}}
Semester: {{semester}}
```

4. Copy your **Service ID**, **Template ID**, and **Public Key** into `config.js`

---

## Step 4 — Connect Notion Items

Right now `store.js` uses `DEMO_ITEMS` as placeholder data.
To pull real items from your Notion database, you need a small server-side proxy (Notion's API requires a secret key that can't be exposed in the browser).

**Easiest option — Cloudflare Worker (free):**

```js
// worker.js
export default {
  async fetch(req, env) {
    const res = await fetch(
      `https://api.notion.com/v1/databases/${env.NOTION_DB_ID}/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.NOTION_SECRET}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filter: { property: 'quantity_available', number: { greater_than: 0 } } }),
      }
    );
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
};
```

Set `NOTION_SECRET` and `NOTION_DB_ID` as Worker environment variables.
Then in `store.js`, replace `DEMO_ITEMS` with:
```js
const res = await fetch('https://your-worker.workers.dev');
const data = await res.json();
const items = data.results.map(mapNotionItem); // parse Notion format
```

---

## Step 5 — Deploy to Subdomain

Upload the 5 files to `apparel.purduechipsi.com`.

**Static hosting options:**
- **Cloudflare Pages** — drag-and-drop, free, connects to your domain easily
- **Netlify** — same, also free
- **GitHub Pages** + Cloudflare for the subdomain DNS

Add a CNAME in your DNS:
```
apparel  CNAME  your-pages-deployment.pages.dev
```

---

## Future Improvements

- [ ] Add size availability per item in Notion
- [ ] Supabase-based order log (track who requested what)
- [ ] Image display once Notion images are populated
- [ ] Payment link (Venmo deeplink or Stripe)
