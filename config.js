// ── CONFIGURATION ──────────────────────────────────
// Fill these in before deploying.

const CONFIG = {
  // Supabase
  SUPABASE_URL:  'https://lefflqwkmledhfrsynxf.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_DTjSGcF3P5Ve_kPtFyJcWA_NT8B0_DY',

  // The table + column in Supabase that holds brother names.
  // e.g. table "brothers", column "full_name"
  BROTHERS_TABLE:  'brothers',   // keep this as whatever your table is named
  BROTHERS_FIRST:  'first_name', // ← replace with your actual column name
  BROTHERS_LAST:   'last_name',  // ← replace with your actual column name

  // Email that purchase interest notifications go to
  NOTIFY_EMAIL: 'secretary.purduechipsi@gmail.com',

  // EmailJS (free tier, no backend needed)
  // Sign up at https://emailjs.com, create a service + template,
  // then paste the IDs here.
  EMAILJS_SERVICE_ID:  'service_0n4jcdr',
  EMAILJS_TEMPLATE_ID: 'template_4xj2ba5',
  EMAILJS_PUBLIC_KEY:  '7dlTF-AB1LehhMNGO',

  // Notion database ID for apparel items
  NOTION_DB_ID: '3370d15555b580f889c8c1c98b827a93',

  // Cloudflare Worker URL (see worker.js for deploy instructions).
  // Set to '' if you've added the custom route in wrangler.toml so that
  // the site and worker share the same origin (/api/* routes work directly).
  // Leave as '' to use demo data locally.
  WORKER_URL: 'https://aet-notion-worker.secretary-purduechipsi.workers.dev'

};
