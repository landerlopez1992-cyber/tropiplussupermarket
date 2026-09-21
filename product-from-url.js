/**
 * Extracción de producto desde URL de proveedor.
 * AutoZone usa captcha: sin Oxylabs solo se infiere nombre/SKU de la URL.
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { URL } = require('url');

function getOxylabsCredentials() {
  let user = process.env.OXYLABS_USER || process.env.OXYLABS_USERNAME || '';
  let pass = process.env.OXYLABS_PASS || process.env.OXYLABS_PASSWORD || '';
  try {
    const cfgPath = path.join(__dirname, 'oxylabs-config.json');
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      if (cfg.username) user = cfg.username;
      if (cfg.password && !String(cfg.password).startsWith('PEGAR')) pass = cfg.password;
    }
  } catch (_) {}
  if (!user || !pass || String(pass).startsWith('PEGAR')) return null;
  return { user, pass };
}

function parseAutoZoneUrlHints(targetUrl) {
  const m = String(targetUrl).match(/\/p\/([a-z0-9-]+)\/(\d+)/i);
  if (!m) return {};
  const parts = m[1].split('-');
  let sku = null;
  if (parts.length && /^\d+$/.test(parts[parts.length - 1])) sku = parts.pop();
  const name = parts.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return { name, sku, productId: m[2], fromUrl: true };
}

function isBlockedHtml(html) {
  const h = String(html || '');
  const low = h.toLowerCase();
  // Página corta de captcha DataDome (no páginas reales que solo mencionan "datadome" en scripts)
  if (h.length < 5000 && (low.includes('captcha-delivery') || low.includes('please enable js'))) {
    return true;
  }
  if (h.length < 1500) return true;
  return false;
}

function decodeHtml(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function fetchViaOxylabs(targetUrl, oxy) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      source: 'universal',
      url: targetUrl,
      render: 'html',
      parse: false
    });
    const auth = Buffer.from(`${oxy.user}:${oxy.pass}`).toString('base64');
    const req = https.request({
      hostname: 'realtime.oxylabs.io',
      path: '/v1/queries',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        try {
          const json = JSON.parse(raw);
          if (res.statusCode >= 400) {
            reject(new Error(json.message || json.error || `Oxylabs HTTP ${res.statusCode}`));
            return;
          }
          const content = json?.results?.[0]?.content;
          if (!content) {
            reject(new Error('Oxylabs sin content'));
            return;
          }
          resolve(typeof content === 'string' ? content : JSON.stringify(content));
        } catch (e) {
          reject(new Error('Oxylabs respuesta inválida'));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(90000, () => { req.destroy(); reject(new Error('Oxylabs timeout')); });
    req.write(payload);
    req.end();
  });
}

function fetchHtmlDirect(targetUrl) {
  return new Promise((resolve, reject) => {
    const u = new URL(targetUrl);
    const lib = u.protocol === 'http:' ? http : https;
    const req = lib.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        reject(new Error('Redirect'));
        return;
      }
      const chunks = [];
      let stream = res;
      const enc = res.headers['content-encoding'];
      if (enc === 'gzip') stream = res.pipe(zlib.createGunzip());
      else if (enc === 'deflate') stream = res.pipe(zlib.createInflate());
      stream.on('data', c => chunks.push(c));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      stream.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

function parseProductHtml(html, targetUrl) {
  const urlHints = parseAutoZoneUrlHints(targetUrl);
  let name = null;
  let image = null;
  let price = null;
  let weight = null;
  let sku = urlHints.sku || null;

  // 1) Imagen de producto AutoZone (CDN real, no iconos)
  const productImg = html.match(/https:\/\/contentassets\.autozone\.com\/product_image\/[^"'\\\s>]+/i);
  if (productImg) image = productImg[0].replace(/&amp;/g, '&');

  // 2) H1 del producto (el correcto suele incluir el part number)
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m =>
    decodeHtml(m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
  ).filter(Boolean);
  if (urlHints.sku) {
    const withSku = h1s.find(t => t.includes(urlHints.sku));
    if (withSku) name = withSku;
  }
  if (!name) {
    const oilLike = h1s.find(t => /motor oil|brake|battery|filter|oil|valvoline|duralast/i.test(t) && t.length > 15);
    if (oilLike) name = oilLike;
  }
  if (!name && h1s[0] && !/location|sign in|cart|menu/i.test(h1s[0])) name = h1s[0];

  // 3) __NEXT_DATA__
  const nextMatch = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (nextMatch) {
    const str = nextMatch[1];
    const priceHits = [...str.matchAll(/"(?:currentPrice|salePrice|regularPrice)"\s*:\s*"?(\d+(?:\.\d+)?)"?/gi)];
    for (const hit of priceHits) {
      const p = parseFloat(hit[1]);
      if (p > 0 && p < 10000) { price = p; break; }
    }
    if (price == null) {
      // "price":"4.00" cerca de product — tomar el más frecuente razonable
      const all = [...str.matchAll(/"price"\s*:\s*"(\d+\.\d{2})"/g)].map(m => parseFloat(m[1])).filter(p => p > 0 && p < 500);
      if (all.length) {
        // moda
        const counts = {};
        all.forEach(p => { counts[p] = (counts[p] || 0) + 1; });
        price = parseFloat(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]);
      }
    }
    const partHit = str.match(/"partNumber"\s*:\s*"([^"\\]+)"/i);
    if (partHit) sku = partHit[1];
    if (!image) {
      const imgHit = str.match(/https:\\\/\\\/contentassets\.autozone\.com\\\/product_image\\\/[^"\\]+/i)
        || str.match(/https:\/\/contentassets\.autozone\.com\/product_image\/[^"\\]+/i);
      if (imgHit) image = imgHit[0].replace(/\\\//g, '/');
    }
    // shipping weight if numeric lbs
    const shipW = str.match(/"shippingWeight"\s*:\s*"?(\d+(?:\.\d+)?)"?/i)
      || str.match(/"netWeight"\s*:\s*"?(\d+(?:\.\d+)?)"?/i);
    if (shipW) weight = shipW[1];
  }

  // 4) og:image solo si es product_image
  if (!image) {
    const og = html.match(/property=["']og:image["'][^>]+content=["'](https?:\/\/contentassets\.autozone\.com\/product_image\/[^"']+)["']/i)
      || html.match(/content=["'](https?:\/\/contentassets\.autozone\.com\/product_image\/[^"']+)["'][^>]+property=["']og:image["']/i)
      || html.match(/content=["'](https?:\/\/contentassets\.autozone\.com\/product_image\/[^"']+)["'][^>]*(?:name|property)=["']og:image["']/i);
    if (og) image = og[1];
  }

  // 5) Precio schema.org / JSON embebido (AutoZone)
  if (price == null) {
    const schemaPrice = html.match(/"price"\s*:\s*"(\d+\.\d{2})"\s*,\s*"priceCurrency"\s*:\s*"USD"/i)
      || html.match(/"priceCurrency"\s*:\s*"USD"\s*,\s*"price"\s*:\s*"(\d+\.\d{2})"/i)
      || html.match(/itemprop=["']price["'][^>]*content=["'](\d+(?:\.\d+)?)["']/i);
    if (schemaPrice) price = parseFloat(schemaPrice[1]);
  }

  // 6) Nombre desde og:title (AutoZone usa name= no siempre property=)
  if (!name) {
    const ogTitle = html.match(/content=["']([^"']{10,200})["'][^>]*(?:name|property)=["']og:title["']/i)
      || html.match(/(?:name|property)=["']og:title["'][^>]+content=["']([^"']{10,200})["']/i);
    if (ogTitle) name = decodeHtml(ogTitle[1]);
  }

  // 7) Garantía AutoZone (Limited-Lifetime, X Year, etc.)
  let warranty = null;
  let warranty_raw = null;
  const warrantyPatterns = [
    /Limited[-\s]?Lifetime\s+Warranty/i,
    /"warranty"\s*:\s*"([^"]{3,80})"/i,
    /Warranty:\s*<\/[^>]+>\s*([^<\n]{3,80})/i,
    /Warranty[:\s]+(Limited[-\s]?Lifetime[^<\n.]{0,40}|Lifetime[^<\n.]{0,20}|\d+\s*[-–]?\s*Year[^<\n.]{0,30})/i,
    /(\d+)\s*[-–]?\s*Year(?:s)?\s+Warranty/i,
    /Limited[-\s]?Lifetime/i
  ];
  for (const re of warrantyPatterns) {
    const m = html.match(re);
    if (!m) continue;
    warranty_raw = (m[1] || m[0] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    break;
  }
  if (warranty_raw) {
    const mapped = mapWarrantyTextToValue(warranty_raw);
    if (mapped) warranty = mapped;
  }

  if (!name && urlHints.name) name = urlHints.name;
  if (!sku && urlHints.sku) sku = urlHints.sku;

  return {
    name: name || null,
    price: price != null && !Number.isNaN(price) ? price : null,
    image: image || null,
    weight: weight || null,
    sku: sku || null,
    warranty: warranty || null,
    warranty_raw: warranty_raw || null,
    source_url: targetUrl
  };
}

/** Mapea texto AutoZone → valor del selector (1-10 | lifetime) */
function mapWarrantyTextToValue(text) {
  const t = String(text || '').toLowerCase();
  if (!t) return null;
  if (/life\s*time|lifetime|de por vida|limited[-\s]?lifetime/.test(t)) return 'lifetime';
  const years = t.match(/(\d+)\s*[-–]?\s*year/);
  if (years) {
    const n = Math.min(10, Math.max(1, parseInt(years[1], 10)));
    return String(n);
  }
  const months = t.match(/(\d+)\s*month/);
  if (months) {
    const y = Math.round(parseInt(months[1], 10) / 12);
    if (y >= 1) return String(Math.min(10, y));
  }
  return null;
}

async function fetchProductFromSupplierUrl(targetUrl) {
  const urlHints = parseAutoZoneUrlHints(targetUrl);
  const oxy = getOxylabsCredentials();
  let html = '';
  let usedOxylabs = false;

  if (oxy) {
    usedOxylabs = true;
    html = await fetchViaOxylabs(targetUrl, oxy);
  } else {
    try {
      html = await fetchHtmlDirect(targetUrl);
    } catch (_) {
      html = '';
    }
  }

  if (!html || isBlockedHtml(html)) {
    if (!oxy && urlHints.name) {
      return {
        name: urlHints.name,
        price: null,
        image: null,
        weight: null,
        sku: urlHints.sku || null,
        source_url: targetUrl,
        partial: true,
        warning: 'AutoZone bloquea bots. Pon el password de Oxylabs en oxylabs-config.json para precio y foto.'
      };
    }
    if (!oxy) {
      throw new Error('AutoZone bloquea el scrape. Configura Oxylabs (oxylabs-config.json) o completa a mano.');
    }
    throw new Error('Oxylabs no devolvió HTML usable. Revisa usuario/password.');
  }

  const parsed = parseProductHtml(html, targetUrl);
  if (!parsed.name && urlHints.name) parsed.name = urlHints.name;
  if (!parsed.sku && urlHints.sku) parsed.sku = urlHints.sku;
  if (parsed.name && /^autozone\.com$/i.test(parsed.name) && urlHints.name) parsed.name = urlHints.name;
  parsed.used_oxylabs = usedOxylabs;
  if (!parsed.name && !parsed.price && !parsed.image) {
    throw new Error('No se detectaron datos. Completa a mano.');
  }
  return parsed;
}

module.exports = {
  fetchProductFromSupplierUrl,
  getOxylabsCredentials,
  parseAutoZoneUrlHints
};
