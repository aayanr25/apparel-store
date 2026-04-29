// ── ORDER ───────────────────────────────────────────
// Handles the "I Want This" modal and sends an interest
// email to the chapter using EmailJS (free, no backend).
//
// Setup:
//   1. Create a free account at https://emailjs.com
//   2. Add an Email Service (Gmail works fine)
//   3. Create an Email Template with these variables:
//        {{brother_name}}  {{item_name}}  {{item_type}}
//        {{item_price}}    {{size}}       {{semester}}
//   4. Paste your Service ID, Template ID, and Public Key
//      into config.js

// Load EmailJS SDK (injected dynamically so it's only
// fetched when the store is actually open)
function loadEmailJS() {
  if (window.emailjs) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    s.onload = () => {
      emailjs.init({ publicKey: CONFIG.EMAILJS_PUBLIC_KEY });
      resolve();
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

let currentItem = null;
let selectedSize = null;

function openModal(item) {
  currentItem = item;
  selectedSize = null;

  document.getElementById('modal-title').textContent  = item.item_name;
  document.getElementById('modal-price').textContent  = item.price ? `$${item.price}` : 'Price TBD';
  document.getElementById('modal-type').textContent   = formatType(item.type);
  document.getElementById('modal-status').className   = 'modal-status hidden';
  document.getElementById('modal-status').textContent = '';
  document.getElementById('confirm-btn').disabled     = false;
  document.getElementById('confirm-btn').textContent  = 'Send Interest →';

  // Reset size buttons and stock status
  document.getElementById('size-stock-status').textContent = '';
  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.classList.remove('selected');
    btn.onclick = () => selectSize(btn);
  });

  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  currentItem = null;
  selectedSize = null;
}

function selectSize(btn) {
  document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedSize = btn.dataset.size;
  const stockEl = document.getElementById('size-stock-status');
  const qty = currentItem?.sizes?.[selectedSize];
  stockEl.textContent = qty === 0 ? 'This size is out of stock.' : '';
}

async function submitOrder() {
  if (!currentItem) return;
  if (!selectedSize) {
    showStatus('Please select a size.', false);
    return;
  }

  const btn = document.getElementById('confirm-btn');
  btn.disabled = true;
  btn.textContent = 'Sending...';

  try {
    await loadEmailJS();

    const templateParams = {
      brother_name: AUTHENTICATED_BROTHER,
      item_name:    currentItem.item_name,
      item_type:    formatType(currentItem.type),
      item_price:   currentItem.price ? `$${currentItem.price}` : 'TBD',
      size:         selectedSize,
      semester:     currentItem.semester_created || '—',
      to_email:     CONFIG.NOTIFY_EMAIL,
    };

    await emailjs.send(
      CONFIG.EMAILJS_SERVICE_ID,
      CONFIG.EMAILJS_TEMPLATE_ID,
      templateParams
    );

    showStatus(`✓ Sent! We'll reach back out to you soon.`, true);
    btn.textContent = 'Sent ✓';

  } catch (err) {
    console.error('EmailJS error:', err);
    btn.disabled = false;
    btn.textContent = 'Send Interest →';
    // EmailJS errors have { status, text }; network errors are plain Error objects
    const detail = err?.text ?? err?.message ?? JSON.stringify(err);
    showStatus(`Failed to send: ${detail}`, false);
  }
}

function showStatus(msg, success) {
  const el = document.getElementById('modal-status');
  el.textContent = msg;
  el.className = 'modal-status ' + (success ? 'success' : 'error');
}

// Close modal on overlay click
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

// Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});
