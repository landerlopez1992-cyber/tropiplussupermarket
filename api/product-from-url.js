// Vercel: POST /api/product-from-url  { url }
const https = require('https');
const http = require('http');
const zlib = require('zlib');
const { URL } = require('url');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const targetUrl = String(req.body?.url || '').trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      return res.status(400).json({ error: 'URL inválida' });
    }
    const data = await fetchAndParse(targetUrl);
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: e.message || 'Error' });
  }
};

function fetchAndParse(targetUrl) {
  return new Promise((resolve, reject) => {
    const oxyUser = process.env.OXYLABS_USER || process.env.OXYLABS_USERNAME;
    const oxyPass = process.env.OXYLABS_PASS || process.env.OXYLABS_PASSWORD;

    if (oxyUser && oxyPass) {
      const payload = JSON.stringify({ source: 'universal', url: targetUrl, render: 'html' });
      const auth = Buffer.from(`${oxyUser}:${oxyPass}`).toString('base64');
      const r = https.request({
        hostname: 'realtime.oxylabs.io',
        path: '/v1/queries',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
          'Content-Length': Buffer.byteLength(payload)
        }
      }, (resp) => {
        const chunks = [];
        resp.on('data', c => chunks.push(c));
        resp.on('end', () => {
          try {
            const json = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            const content = json?.results?.[0]?.content || '';
            resolve(parseHtml(typeof content === 'string' ? content : JSON.stringify(content), targetUrl));
          } catch (e) { reject(e); }
        });
      });
      r.on('error', reject);
      r.write(payload);
      r.end();
      return;
    }

    const u = new URL(targetUrl);
    const lib = u.protocol === 'http:' ? http : https;
    const r = lib.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TropiPartsBot/1.0)', Accept: 'text/html' }
    }, (resp) => {
      if (resp.statusCode >= 300 && resp.statusCode < 400) {
        reject(new Error('Redirect — configura Oxylabs o completa a mano'));
        return;
      }
      const chunks = [];
      let stream = resp;
      if (resp.headers['content-encoding'] === 'gzip') stream = resp.pipe(zlib.createGunzip());
      stream.on('data', c => chunks.push(c));
      stream.on('end', () => {
        try {
          resolve(parseHtml(Buffer.concat(chunks).toString('utf8'), targetUrl));
        } catch (e) { reject(e); }
      });
      stream.on('error', reject);
    });
    r.on('error', reject);
    r.setTimeout(15000, () => { r.destroy(); reject(new Error('Timeout')); });
    r.end();
  });
}

function parseHtml(html, targetUrl) {
  const pickMeta = (prop) => {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i');
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i');
    const m = html.match(re) || html.match(re2);
    return m ? m[1] : null;
  };
  let name = pickMeta('og:title');
  let image = pickMeta('og:image');
  let price = null;
  let weight = null;
  let sku = null;
  const ld = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const block of ld) {
    try {
      const data = JSON.parse(block.replace(/<\/?script[^>]*>/gi, ''));
      const nodes = Array.isArray(data) ? data : (data['@graph'] || [data]);
      for (const node of nodes) {
        const type = node?.['@type'];
        if (!(type === 'Product' || (Array.isArray(type) && type.includes('Product')))) continue;
        if (!name && node.name) name = node.name;
        if (!image && node.image) image = Array.isArray(node.image) ? (node.image[0]?.url || node.image[0]) : (node.image.url || node.image);
        if (node.sku) sku = String(node.sku);
        const offer = Array.isArray(node.offers) ? node.offers[0] : node.offers;
        if (offer?.price != null) price = parseFloat(offer.price);
        if (node.weight) weight = typeof node.weight === 'object' ? `${node.weight.value || ''}`.trim() : String(node.weight);
      }
    } catch (_) {}
  }
  if (price == null) {
    const m = html.match(/"price"\s*:\s*"?(\d+(?:\.\d+)?)"?/i) || html.match(/\$(\d+\.\d{2})/);
    if (m) price = parseFloat(m[1]);
  }
  if (!name && !price && !image) throw new Error('No se detectaron datos. Completa a mano.');
  return { name, price, image, weight, sku, source_url: targetUrl };
}
