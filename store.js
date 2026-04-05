// ── STORE ───────────────────────────────────────────
// Loads apparel items from the Cloudflare Worker proxy.
// Falls back to DEMO_ITEMS if WORKER_URL is not configured.

const DEMO_ITEMS = [
  {
    id: '1',
    item_name: 'Founders Hoodie',
    type: 'hoodie',
    price: 45,
    quantity_available: 8,
    semester_created: 'Fall 2023',
    front_url: null,
    back_url: null,
  },
  {
    id: '2',
    item_name: 'Rush Tee',
    type: 'tshirt',
    price: 22,
    quantity_available: 14,
    semester_created: 'Spring 2024',
    front_url: null,
    back_url: null,
  },
  {
    id: '3',
    item_name: 'ΑΕΤ Crewneck',
    type: 'sweater',
    price: 38,
    quantity_available: 0,
    semester_created: 'Fall 2024',
    front_url: null,
    back_url: null,
  },
];

async function loadItems() {
  const grid = document.getElementById('items-grid');
  let items = DEMO_ITEMS;

  if (CONFIG.WORKER_URL) {
    try {
     const res = await fetch(`${CONFIG.WORKER_URL}/api/apparel`);
    if (res.ok) {
      items = await res.json();
      
      // Fix relative image URLs to point to the worker
      items = items.map(item => ({
        ...item,
        front_url: item.front_url ? `${CONFIG.WORKER_URL}${item.front_url}` : null,
        back_url:  item.back_url  ? `${CONFIG.WORKER_URL}${item.back_url}`  : null,
      }));
    } else {
        console.warn('Worker returned', res.status, '— falling back to demo data');
      }
    } catch (e) {
      console.warn('Worker unreachable, using demo data:', e);
    }
  }

  grid.innerHTML = '';

  if (!items.length) {
    grid.innerHTML = '<p style="color:var(--muted);font-size:.85rem">No items available right now.</p>';
    return;
  }

  items.forEach((item, i) => grid.appendChild(buildCard(item, i)));
}

function buildCard(item, index) {
  const card    = document.createElement('div');
  card.className = 'item-card';
  card.style.animationDelay = `${index * 0.07}s`;

  const soldOut  = item.quantity_available === 0;
  const priceStr = item.price ? `$${item.price}` : 'TBD';
  const qtyStr   = soldOut ? 'Sold out' : `${item.quantity_available} left`;

  card.innerHTML = `
    ${buildImageHtml(item)}
    <div class="item-body">
      <span class="item-tag">${formatType(item.type)}</span>
      <div class="item-name">${item.item_name}</div>
      <div class="item-meta">
        <span class="item-price">${priceStr}</span>
        <span class="item-qty">${qtyStr}</span>
      </div>
      <button
        class="item-btn${soldOut ? ' sold-out' : ''}"
        ${soldOut ? 'disabled' : `onclick="openModal(${JSON.stringify(item).replace(/"/g, '&quot;')})"`}
      >${soldOut ? 'Sold Out' : 'I Want This &rarr;'}</button>
    </div>
  `;

  return card;
}

function buildImageHtml(item) {
  const hasFront = !!item.front_url;
  const hasBack  = !!item.back_url;

  if (hasFront && hasBack) {
    return `
      <div class="item-img-grid">
        <div class="item-img-wrap">
          <img class="item-img" src="${item.front_url}" alt="${item.item_name} — front" loading="lazy" onclick="openLightbox(this)">
          <span class="img-label">FRONT</span>
        </div>
        <div class="item-img-wrap">
          <img class="item-img" src="${item.back_url}" alt="${item.item_name} — back" loading="lazy" onclick="openLightbox(this)">
          <span class="img-label">BACK</span>
        </div>
      </div>`;
  }

  if (hasFront || hasBack) {
    const url   = hasFront ? item.front_url : item.back_url;
    const label = hasFront ? 'FRONT' : 'BACK';
    return `
      <div class="item-img-single">
        <img class="item-img" src="${url}" alt="${item.item_name}" loading="lazy" onclick="openLightbox(this)">
        <span class="img-label">${label}</span>
      </div>`;
  }

  return `<div class="item-img-placeholder">ΧΨ</div>`;
}

function openLightbox(img) {
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightbox-img');
  lbImg.src = img.src;
  lbImg.alt = img.alt;
  lb.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  document.getElementById('lightbox').classList.add('hidden');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox();
});

function formatType(type) {
  const map = {
    tshirt:       'T-Shirt',
    hoodie:       'Hoodie',
    'long-sleeve': 'Long Sleeve',
    sweater:      'Sweater',
  };
  return map[type] || type;
}
