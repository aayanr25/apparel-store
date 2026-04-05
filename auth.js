// ── AUTH ────────────────────────────────────────────
// Checks entered name against the Supabase brothers table.
// On success, stores the name in sessionStorage and shows the store.

let AUTHENTICATED_BROTHER = null;

async function authenticate() {
  const input = document.getElementById('brother-name');
  const errorEl = document.getElementById('gate-error');
  const btn = document.getElementById('enter-btn');

  const raw = input.value.trim();
  if (!raw) return;

  btn.textContent = '...';
  btn.disabled = true;
  errorEl.classList.add('hidden');

  try {
    // Query Supabase REST API directly (no SDK needed)
const first = raw.split(' ')[0];
const last  = raw.split(' ').slice(1).join(' ');

const url = `${CONFIG.SUPABASE_URL}/rest/v1/${CONFIG.BROTHERS_TABLE}`
  + `?select=${CONFIG.BROTHERS_FIRST},${CONFIG.BROTHERS_LAST}`
  + `&${CONFIG.BROTHERS_FIRST}=ilike.${encodeURIComponent(first)}`
  + `&${CONFIG.BROTHERS_LAST}=ilike.${encodeURIComponent(last)}`
  + `&limit=1`;

    const res = await fetch(url, {
      headers: {
        'apikey': CONFIG.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
      },
    });

    if (!res.ok) throw new Error('Supabase error: ' + res.status);

    const data = await res.json();

  if (data.length > 0) {
  const row = data[0];
  AUTHENTICATED_BROTHER = `${row[CONFIG.BROTHERS_FIRST]} ${row[CONFIG.BROTHERS_LAST]}`;
  sessionStorage.setItem('aet_brother', AUTHENTICATED_BROTHER);
  showStore();
  } else {
      // ❌ Not found
      errorEl.classList.remove('hidden');
      input.value = '';
      input.focus();
    }
  } catch (err) {
    console.error(err);
    errorEl.textContent = 'Something went wrong. Try again.';
    errorEl.classList.remove('hidden');
  } finally {
    btn.textContent = 'Enter';
    btn.disabled = false;
  }
}

function showStore() {
  document.getElementById('gate').classList.remove('active');
  document.getElementById('store').classList.add('active');
  document.getElementById('header-name').textContent = AUTHENTICATED_BROTHER;
  loadItems();
}

// Allow Enter key on input
document.getElementById('brother-name').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') authenticate();
});

// Check if already authenticated this session
window.addEventListener('DOMContentLoaded', () => {
  const saved = sessionStorage.getItem('aet_brother');
  if (saved) {
    AUTHENTICATED_BROTHER = saved;
    showStore();
  } else {
    document.getElementById('gate').classList.add('active');
  }
});
