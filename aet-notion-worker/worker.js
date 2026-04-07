const NOTION_DB_ID = '3370d15555b580f889c8c1c98b827a93';
const NOTION_VERSION = '2022-06-28';

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
      let cachedRes = await cache.match(cacheKey);
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
          body: JSON.stringify({
            filter: {
              property: 'quantity_available',
              number: { greater_than: 0 }
            }
          }),
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
          quantity_available: p.quantity_available?.number ?? 0,
          semester_created:   p.semester_created?.rich_text?.[0]?.plain_text ?? '',
          front_url: hasFile(p.front) ? `/api/image?pageId=${page.id}&field=front` : null,
          back_url:  hasFile(p.back)  ? `/api/image?pageId=${page.id}&field=back`  : null,
        };
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
    }

    // ── GET /api/image?pageId=XXX&field=front ────────
    if (url.pathname === '/api/image') {
      const pageId = url.searchParams.get('pageId');
      const field  = url.searchParams.get('field');
      if (!pageId || !field) return new Response('Missing params', { status: 400, headers: cors });

      // Fetch fresh page data from Notion
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

      // Attachment-style files — retrieve signed URL via Notion API
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
    if (url.pathname === '/api/refresh') {
      const cacheKey = new Request('https://cache/apparel', request);
      await caches.default.delete(cacheKey);
      return new Response('Cache cleared', { headers: cors });
    }
    return new Response('Not found', { status: 404, headers: cors });
  }
};
