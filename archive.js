// ── ARCHIVE ──────────────────────────────────────────
// Auth gate: redirect to index.html if not authenticated.
// Fetches all items from /api/archive and renders a polaroid wall
// grouped by semester.

window.addEventListener('DOMContentLoaded', () => {
  const brother = sessionStorage.getItem('aet_brother');
  if (!brother) {
    window.location.href = 'index.html';
    return;
  }
  document.getElementById('header-name').textContent = brother;
  loadArchive();
});

async function loadArchive() {
  const wall = document.getElementById('archive-wall');

  // Show skeleton while loading
  wall.innerHTML = `
    <div class="archive-skeleton-wrap">
      <div class="archive-skeleton"></div>
      <div class="archive-skeleton"></div>
      <div class="archive-skeleton"></div>
      <div class="archive-skeleton"></div>
    </div>`;

  let items = [];
  console.log('Fetching from:', CONFIG.WORKER_URL);
  try {
    const res = await fetch(`${CONFIG.WORKER_URL}/api/archive`);
    const raw = await res.json();

    if (!res.ok) {
      console.error('Archive fetch failed:', res.status, raw);
    } else if (!Array.isArray(raw)) {
      console.error('Archive response is not an array:', raw);
    } else {
      // Prepend worker URL to relative image paths
      items = raw.map(item => ({
        ...item,
        front_url: item.front_url ? `${CONFIG.WORKER_URL}${item.front_url}` : null,
        back_url:  item.back_url  ? `${CONFIG.WORKER_URL}${item.back_url}`  : null,
      }));
      console.log(`Archive: loaded ${items.length} items`);
    }
  } catch (e) {
    console.error('Archive fetch error:', e);
  }

  wall.innerHTML = '';

  if (!items.length) {
    wall.innerHTML = '<p style="color:var(--muted);font-size:.85rem;padding:40px 0">Nothing in the archive yet.</p>';
    return;
  }

  // Group by semester (semester groups are already sorted newest-first by the worker)
  const semesters = [];
  const semesterMap = new Map();
  items.forEach(item => {
    const key = item.semester_created || 'Unknown';
    if (!semesterMap.has(key)) {
      semesterMap.set(key, []);
      semesters.push({ label: key, date: item.semester_created_date, items: semesterMap.get(key) });
    }
    semesterMap.get(key).push(item);
  });

  // Within each semester, sort items ascending by date (oldest left, newest right)
  semesters.forEach(s => {
    s.items.sort((a, b) => {
      if (!a.semester_created_date && !b.semester_created_date) return 0;
      if (!a.semester_created_date) return 1;
      if (!b.semester_created_date) return -1;
      return a.semester_created_date.localeCompare(b.semester_created_date);
    });
  });

  try {
    semesters.forEach(({ label, items: semItems }) => {
      const section = document.createElement('section');
      section.className = 'semester-section';

      const tape = document.createElement('div');
      tape.className = 'semester-tape';
      tape.textContent = label;
      section.appendChild(tape);

      const pairsRow = document.createElement('div');
      pairsRow.className = 'polaroid-row';

      semItems.forEach(item => {
        const pair = buildPolaroidPair(item);
        pairsRow.appendChild(pair);
      });

      section.appendChild(pairsRow);
      wall.appendChild(section);
    });
  } catch (e) {
    console.error('Archive render error:', e);
    wall.innerHTML = `<p style="color:#c0392b;font-size:.8rem;padding:40px 0">Render error: ${e.message}</p>`;
  }
}

function buildPolaroidPair(item) {
  const pair = document.createElement('div');
  pair.className = 'polaroid-pair';

  const frontCard = buildPolaroid(item, 'front', item.front_url);
  const backCard  = buildPolaroid(item, 'back',  item.back_url);

  pair.appendChild(frontCard);
  pair.appendChild(backCard);
  return pair;
}

function buildPolaroid(item, side, imageUrl) {
  // Use a different hash offset for back so the two cards in a pair differ
  const rotSeed = side === 'back' ? item.id + '__back' : item.id;
  const rot = getRotation(rotSeed);

  const card = document.createElement('div');
  card.className = 'polaroid';
  card.style.setProperty('--rot', `${rot}deg`);

  const photoArea = document.createElement('div');
  photoArea.className = 'polaroid-photo';

  if (imageUrl) {
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = `${item.item_name} — ${side}`;
    img.loading = 'lazy';
    photoArea.appendChild(img);
    card.addEventListener('click', () => openLightbox(img));
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'item-img-placeholder';
    placeholder.textContent = 'ΧΨ';
    photoArea.appendChild(placeholder);
  }

  const caption = document.createElement('div');
  caption.className = 'polaroid-caption';

  const name = document.createElement('div');
  name.className = 'polaroid-name';
  name.textContent = item.item_name;

  const label = document.createElement('div');
  label.className = 'polaroid-label';
  label.textContent = side.toUpperCase();

  caption.appendChild(name);
  caption.appendChild(label);

  if (item.designer) {
    const designer = document.createElement('div');
    designer.className = 'polaroid-designer';
    designer.textContent = item.designer;
    caption.appendChild(designer);
  }

  card.appendChild(photoArea);
  card.appendChild(caption);
  return card;
}

// Deterministic rotation from item id string
function getRotation(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  return ((hash % 13) - 6); // value between -6 and +6
}

function openLightbox(img) {
  const lb    = document.getElementById('lightbox');
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
