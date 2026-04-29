// ── AUTH ────────────────────────────────────────────
// Checks entered name against brothers.json (project root).
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
    const res = await fetch('./brothers.json');
    const brothers = await res.json();

    const entered = raw.toLowerCase();

    const match = brothers.find(b => {
      // Match: "First Last" (legal name)
      const fullName = `${b.first} ${b.last}`.toLowerCase();
      if (entered === fullName) return true;

      // Match: preferred name if present
      if (b.preferred) {
        const preferred = b.preferred.toLowerCase();
        if (entered === preferred) return true;

        // Match preferred first name + legal last name
        const prefFirst = preferred.split(' ')[0];
        const prefAndLegalLast = `${prefFirst} ${b.last}`.toLowerCase();
        if (entered === prefAndLegalLast) return true;
      }

      return false;
    });

    if (match) {
      // Use preferred name for display if available, else legal first + last
      const displayName = match.preferred || `${match.first} ${match.last}`;
      AUTHENTICATED_BROTHER = displayName;
      sessionStorage.setItem('aet_brother', displayName);
      showStore();
    } else {
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
