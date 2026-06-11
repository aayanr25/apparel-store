// ── AUTH ────────────────────────────────────────────
// Checks entered name against the live roster served by the Cloudflare
// Worker (/api/members), which mirrors the Brothers portal's Roster sheet.
// On success, stores the entered name in sessionStorage and shows the store.

let AUTHENTICATED_BROTHER = null;
let MEMBERS = null;          // Array<{ first, last, nickname }> once loaded
let membersLoadFailed = false;

// Fetch the roster from the Worker. Returns Array<{ first, last, nickname }>.
async function loadMembers() {
  const res = await fetch(`${CONFIG.WORKER_URL}/api/members`);
  if (!res.ok) throw new Error('Failed to load roster');
  return await res.json();
}

// Same matching logic as the main site's Brothers portal.
function isValidName(input, members) {
  const q = input.trim().toLowerCase();
  if (!q) return false;
  return members.some(m => {
    const fullName = `${m.first} ${m.last}`.toLowerCase();
    const nickLast = m.nickname ? `${m.nickname} ${m.last}`.toLowerCase() : null;
    const nickOnly = m.nickname ? m.nickname.toLowerCase() : null;
    return q === fullName || q === nickLast || (nickOnly && q === nickOnly);
  });
}

// Load the roster as the gate appears. Disables entry until ready and shows
// a graceful error if it can't be loaded — never lets the user proceed with
// an empty list.
async function initMembers() {
  const input   = document.getElementById('brother-name');
  const btn      = document.getElementById('enter-btn');
  const errorEl = document.getElementById('gate-error');

  membersLoadFailed = false;
  MEMBERS = null;

  const prevPlaceholder = input.placeholder;
  input.placeholder = 'Loading…';
  input.disabled = true;
  btn.disabled = true;
  errorEl.classList.add('hidden');

  try {
    MEMBERS = await loadMembers();
    input.disabled = false;
    btn.disabled = false;
    input.placeholder = prevPlaceholder;
    input.focus();
  } catch (err) {
    console.error(err);
    membersLoadFailed = true;
    input.placeholder = prevPlaceholder;
    errorEl.textContent = 'Could not load member list. Please refresh and try again.';
    errorEl.classList.remove('hidden');
    // Leave input/button disabled so nobody proceeds without a roster.
  }
}

async function authenticate() {
  const input   = document.getElementById('brother-name');
  const errorEl = document.getElementById('gate-error');
  const btn      = document.getElementById('enter-btn');

  const raw = input.value.trim();
  if (!raw) return;

  if (membersLoadFailed || !MEMBERS) {
    errorEl.textContent = 'Could not load member list. Please refresh and try again.';
    errorEl.classList.remove('hidden');
    return;
  }

  btn.textContent = '...';
  btn.disabled = true;
  errorEl.classList.add('hidden');

  if (isValidName(raw, MEMBERS)) {
    // Display name stored for the order stays exactly what the user typed.
    AUTHENTICATED_BROTHER = raw;
    sessionStorage.setItem('aet_brother', raw);
    showStore();
  } else {
    errorEl.textContent = 'Name not recognized. Try again.';
    errorEl.classList.remove('hidden');
    input.value = '';
    input.focus();
  }

  btn.textContent = 'Enter';
  btn.disabled = false;
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
    initMembers();
  }
});
