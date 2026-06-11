const NOTION_DB_ID = '3370d15555b580f889c8c1c98b827a93';
const NOTION_VERSION = '2022-06-28';
const ROSTER_SHEET_ID = '1XHAsME5GMGJ31MM0Uo77hFWdXBSB9E1_YDywiFGzNtI';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '*';
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Vary': 'Origin',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    // ── GET /api/apparel ─────────────────────────────
    if (url.pathname === '/api/apparel') {
      const cacheKey = new Request('https://cache/apparel', request);
      const cache = caches.default;
      const cachedRes = await cache.match(cacheKey);
      if (cachedRes) return cachedRes;

      const res = await fetch(
        `https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.NOTION_SECRET}`,
            'Notion-Version': NOTION_VERSION,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );
      const data = await res.json();

      const items = data.results.map(page => {
        const p = page.properties;
        const hasFile = (prop) => prop?.files?.length > 0;
        return {
          id: page.id,
          item_name: p.item_name?.title?.[0]?.plain_text ?? '',
          type:       p.type?.select?.name ?? '',
          price:      p.price?.number ?? null,
          quantity_available: p.quantity_available?.formula?.number ?? 0,
          semester_created:   p.semester_created?.rich_text?.[0]?.plain_text ?? '',
          sizes: {
            S:   p.small?.number ?? null,
            M:   p.medium?.number ?? null,
            L:   p.large?.number ?? null,
            XL:  p.extra_large?.number ?? null,
            XXL: p['2_exlarge']?.number ?? null,
          },
          front_url: hasFile(p.front) ? `/api/image?pageId=${page.id}&field=front` : null,
          back_url:  hasFile(p.back)  ? `/api/image?pageId=${page.id}&field=back`  : null,
        };
      });

      const filteredItems = items.filter(item => item.quantity_available > 0);

      const response = new Response(JSON.stringify(filteredItems), {
        headers: {
          ...cors,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=600',
        },
      });
      await cache.put(cacheKey, response.clone());
      return response;
    }

    // ── GET /api/archive ─────────────────────────────
    if (url.pathname === '/api/archive') {
      try {
        const cacheKey = new Request('https://cache/archive', request);
        const cache = caches.default;
        const cachedRes = await cache.match(cacheKey);
        if (cachedRes) return cachedRes;

        const notionRes = await fetch(
          `https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.NOTION_SECRET}`,
              'Notion-Version': NOTION_VERSION,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
          }
        );

        const data = await notionRes.json();

        if (!notionRes.ok) {
          return new Response(JSON.stringify({ error: 'Notion API error', detail: data }),
            { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } });
        }

        if (!Array.isArray(data.results)) {
          return new Response(JSON.stringify({ error: 'Unexpected Notion response', detail: data }),
            { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } });
        }

        const items = data.results.map(page => {
          const p = page.properties;
          const hasFile = (prop) => prop?.files?.length > 0;

          const semesterText = p.semester_created?.rich_text?.[0]?.plain_text
            ?? p.semester_created?.select?.name
            ?? '';

          const semesterDate =
            p.semester_created_date?.date?.start
            ?? semesterToDate(semesterText);

          const designer =
            p.designer?.rich_text?.[0]?.plain_text
            ?? p.designer?.select?.name
            ?? null;

          return {
            id:                    page.id,
            item_name:             p.item_name?.title?.[0]?.plain_text ?? '',
            type:                  p.type?.select?.name ?? '',
            price:                 p.price?.number ?? null,
            quantity_available:    p.quantity_available?.formula?.number ?? 0,
            semester_created:      semesterText,
            semester_created_date: semesterDate,
            designer,
            front_url: hasFile(p.front) ? `/api/image?pageId=${page.id}&field=front` : null,
            back_url:  hasFile(p.back)  ? `/api/image?pageId=${page.id}&field=back`  : null,
          };
        });

        // Sort newest-first; items with no date go to the end
        items.sort((a, b) => {
          if (!a.semester_created_date && !b.semester_created_date) return 0;
          if (!a.semester_created_date) return 1;
          if (!b.semester_created_date) return -1;
          return b.semester_created_date.localeCompare(a.semester_created_date);
        });

        const response = new Response(JSON.stringify(items), {
          headers: {
            ...cors,
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=600',
          },
        });
        await cache.put(cacheKey, response.clone());
        return response;

      } catch (e) {
        return new Response(JSON.stringify({ error: e.message, stack: e.stack }),
          { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
      }
    }

    // ── GET /api/members ─────────────────────────────
    if (url.pathname === '/api/members') {
      try {
        const cacheKey = new Request('https://cache/members', request);
        const cache = caches.default;
        const cachedRes = await cache.match(cacheKey);
        if (cachedRes) return cachedRes;

        const sheetRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${ROSTER_SHEET_ID}/values/Roster?key=${env.GOOGLE_DRIVE_API_KEY}`
        );
        const data = await sheetRes.json();

        if (!sheetRes.ok || !Array.isArray(data.values)) {
          return new Response(JSON.stringify({ error: 'Failed to load roster' }),
            { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
        }

        // Skip row 0 (header)
        const members = data.values.slice(1).reduce((acc, row) => {
          const first    = row[0]?.trim() ?? '';
          const last     = row[1]?.trim() ?? '';
          const nickname = row[2]?.trim() ?? '';
          if (!first && !last) return acc;
          acc.push({ first, last, nickname });
          return acc;
        }, []);

        const response = new Response(JSON.stringify(members), {
          headers: {
            ...cors,
            'Content-Type': 'application/json',
            'Cache-Control': 's-maxage=300',
          },
        });
        await cache.put(cacheKey, response.clone());
        return response;

      } catch (e) {
        return new Response(JSON.stringify({ error: 'Failed to load roster' }),
          { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
      }
    }

    // ── GET /api/image?pageId=XXX&field=front ────────
    if (url.pathname === '/api/image') {
      const pageId = url.searchParams.get('pageId');
      const field  = url.searchParams.get('field');
      if (!pageId || !field) return new Response('Missing params', { status: 400, headers: cors });

      const pageRes = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
        headers: {
          'Authorization': `Bearer ${env.NOTION_SECRET}`,
          'Notion-Version': NOTION_VERSION,
        },
      });
      const page = await pageRes.json();
      const fileObj = page.properties?.[field]?.files?.[0];

      if (!fileObj) return new Response('Image not found', { status: 404, headers: cors });

      let freshUrl = null;

      if (fileObj.type === 'file' && fileObj.file?.url) {
        freshUrl = fileObj.file.url;
      } else if (fileObj.type === 'external' && fileObj.external?.url) {
        freshUrl = fileObj.external.url;
      }

      if (!freshUrl) {
        const signRes = await fetch('https://api.notion.com/v1/files/signed-url', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.NOTION_SECRET}`,
            'Notion-Version': NOTION_VERSION,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: fileObj.file?.url ?? fileObj.url }),
        });
        const signData = await signRes.json();
        freshUrl = signData?.signed_url ?? null;
      }

      if (!freshUrl) return new Response('Could not resolve image URL', { status: 404, headers: cors });

      const imgRes = await fetch(freshUrl);
      const contentType = imgRes.headers.get('Content-Type') || 'image/jpeg';
      return new Response(imgRes.body, {
        headers: {
          ...cors,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // ── GET /api/refresh ─────────────────────────────
    if (url.pathname === '/api/refresh') {
      const cache = caches.default;
      await cache.delete(new Request('https://cache/apparel', request));
      await cache.delete(new Request('https://cache/archive', request));
      await cache.delete(new Request('https://cache/members', request));
      return new Response('Cache cleared', { headers: cors });
    }

    return new Response('Not found', { status: 404, headers: cors });
  },
};

// "Fall 2023" → "2023-09-01", "Spring 2024" → "2024-01-01", "Summer 2024" → "2024-05-01"
function semesterToDate(semester) {
  const m = semester.match(/^(Fall|Spring|Summer)\s+(\d{4})$/i);
  if (!m) return null;
  const year = m[2];
  const term = m[1].toLowerCase();
  if (term === 'spring') return `${year}-01-01`;
  if (term === 'summer') return `${year}-05-01`;
  if (term === 'fall')   return `${year}-09-01`;
  return null;
}
