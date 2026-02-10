// Servidor Proxy para Square API - Tropiplus Supermarket
const http = require('http');
const https = require('https');
const url = require('url');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

const PORT = 8080;
const SQUARE_API_BASE = 'https://connect.squareup.com';
const SQUARE_ACCESS_TOKEN = 'EAAAl2nJjLDUfcBLy2EIXc7ipUq3Pwkr3PcSji6oC1QmgtUK5E8UyeICc0mbowZB';

function serveStaticFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('File not found');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

function proxyToSquare(req, res) {
  const apiPath = req.url.replace('/api/square', '');
  const squareUrl = `${SQUARE_API_BASE}${apiPath}`;

  const options = {
    method: req.method,
    headers: {
      'Square-Version': '2024-01-18',
      'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    }
  };

  const squareReq = https.request(squareUrl, options, (squareRes) => {
    let responseData = '';
    
    squareRes.on('data', (chunk) => {
      responseData += chunk;
    });
    
    squareRes.on('end', () => {
      // Asegurar que la respuesta sea JSON válido
      let jsonResponse;
      try {
        // Si la respuesta ya es JSON, parsearla y reenviarla
        if (responseData) {
          jsonResponse = JSON.parse(responseData);
        } else {
          jsonResponse = {};
        }
      } catch (parseError) {
        // Si no es JSON válido, crear un objeto de error
        console.error('Error parseando respuesta de Square:', parseError);
        jsonResponse = {
          error: 'Invalid JSON response from Square API',
          raw: responseData.substring(0, 500) // Primeros 500 caracteres para debugging
        };
      }
      
      res.writeHead(squareRes.statusCode, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
      });
      
      res.end(JSON.stringify(jsonResponse));
    });
  });

  squareReq.on('error', (error) => {
    console.error('Error en proxy:', error);
    res.writeHead(500);
    res.end(JSON.stringify({ error: error.message }));
  });

  if (req.method === 'POST' || req.method === 'PUT') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      squareReq.write(body);
      squareReq.end();
    });
  } else {
    squareReq.end();
  }
}

function normalizeBarcode(rawValue) {
  if (!rawValue) return '';
  const digits = String(rawValue).replace(/\D/g, '');
  return [8, 12, 13, 14].includes(digits.length) ? digits : '';
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function httpRequest(targetUrl, options = {}) {
  const parsed = url.parse(targetUrl);
  const isHttps = parsed.protocol === 'https:';
  const httpModule = isHttps ? https : http;
  const timeout = options.timeout || 12000;
  const requestHeaders = options.headers || {};

  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.path || '/',
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Tropiplus Barcode Lookup)',
        'Accept': 'application/json,text/plain,*/*',
        'Accept-Encoding': 'gzip, deflate',
        ...requestHeaders
      }
    };

    const externalReq = httpModule.request(reqOptions, (externalRes) => {
      const chunks = [];
      externalRes.on('data', (chunk) => chunks.push(chunk));
      externalRes.on('end', () => {
        try {
          const rawBuffer = Buffer.concat(chunks);
          const encoding = externalRes.headers['content-encoding'];
          let decodedBuffer = rawBuffer;

          if (encoding === 'gzip') {
            decodedBuffer = zlib.gunzipSync(rawBuffer);
          } else if (encoding === 'deflate') {
            decodedBuffer = zlib.inflateSync(rawBuffer);
          }

          resolve({
            statusCode: externalRes.statusCode,
            headers: externalRes.headers,
            body: decodedBuffer.toString('utf8')
          });
        } catch (decodeError) {
          reject(decodeError);
        }
      });
    });

    externalReq.on('error', reject);
    externalReq.on('timeout', () => {
      externalReq.destroy();
      reject(new Error('Timeout consultando fuente externa'));
    });

    externalReq.setTimeout(timeout);

    if (options.body) {
      externalReq.write(options.body);
    }

    externalReq.end();
  });
}

function httpRequestBinary(targetUrl, options = {}) {
  const parsed = url.parse(targetUrl);
  const isHttps = parsed.protocol === 'https:';
  const httpModule = isHttps ? https : http;
  const timeout = options.timeout || 12000;
  const requestHeaders = options.headers || {};

  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.path || '/',
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Tropiplus Image Uploader)',
        'Accept': '*/*',
        ...requestHeaders
      }
    };

    const externalReq = httpModule.request(reqOptions, (externalRes) => {
      const chunks = [];
      externalRes.on('data', (chunk) => chunks.push(chunk));
      externalRes.on('end', () => {
        resolve({
          statusCode: externalRes.statusCode,
          headers: externalRes.headers,
          body: Buffer.concat(chunks)
        });
      });
    });

    externalReq.on('error', reject);
    externalReq.on('timeout', () => {
      externalReq.destroy();
      reject(new Error('Timeout descargando imagen'));
    });
    externalReq.setTimeout(timeout);
    externalReq.end();
  });
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], 'base64')
  };
}

async function handleCreateCatalogImageProxy(req, res) {
  try {
    const rawBody = await readRequestBody(req);
    const body = rawBody ? JSON.parse(rawBody) : {};

    const idempotencyKey = body.idempotency_key || `img_key_${Date.now()}`;
    const objectId = body.object_id || '';
    const imageName = body.image_name || 'Imagen Producto';
    const imageUrl = body.image_url || '';
    const imageDataUrl = body.image_data_url || '';

    let imageBuffer = null;
    let mimeType = 'image/jpeg';
    let filename = 'product-image.jpg';

    if (imageUrl) {
      const downloaded = await httpRequestBinary(imageUrl, { timeout: 15000 });
      if (downloaded.statusCode < 200 || downloaded.statusCode >= 300) {
        throw new Error(`No se pudo descargar la imagen externa (${downloaded.statusCode})`);
      }
      imageBuffer = downloaded.body;
      const contentType = String(downloaded.headers['content-type'] || '').toLowerCase();
      if (contentType.includes('png')) {
        mimeType = 'image/png';
        filename = 'product-image.png';
      } else if (contentType.includes('gif')) {
        mimeType = 'image/gif';
        filename = 'product-image.gif';
      } else if (contentType.includes('webp')) {
        mimeType = 'image/webp';
        filename = 'product-image.webp';
      }
    } else if (imageDataUrl) {
      const parsed = parseDataUrl(imageDataUrl);
      if (!parsed) {
        throw new Error('Formato de image_data_url invalido');
      }
      imageBuffer = parsed.buffer;
      mimeType = parsed.mimeType || mimeType;
      if (mimeType.includes('png')) filename = 'product-image.png';
      if (mimeType.includes('gif')) filename = 'product-image.gif';
      if (mimeType.includes('webp')) filename = 'product-image.webp';
    } else {
      throw new Error('Debes enviar image_url o image_data_url');
    }

    const boundary = `----TropiplusBoundary${Date.now()}`;
    const imageObjectJson = JSON.stringify({
      type: 'IMAGE',
      id: '#TMP_IMAGE',
      image_data: {
        name: imageName
      }
    });

    const requestJson = JSON.stringify({
      idempotency_key: idempotencyKey,
      object_id: objectId || undefined,
      image: JSON.parse(imageObjectJson)
    });

    const parts = [];
    // Square espera un unico part JSON llamado "request"
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="request"\r\nContent-Type: application/json\r\n\r\n${requestJson}\r\n`));
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`));
    parts.push(imageBuffer);
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    const multipartBody = Buffer.concat(parts);

    const options = {
      hostname: 'connect.squareup.com',
      port: 443,
      path: '/v2/catalog/images',
      method: 'POST',
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': multipartBody.length
      }
    };

    const squareReq = https.request(options, (squareRes) => {
      const chunks = [];
      squareRes.on('data', (chunk) => chunks.push(chunk));
      squareRes.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let jsonResponse;
        try {
          jsonResponse = raw ? JSON.parse(raw) : {};
        } catch (error) {
          jsonResponse = { raw };
        }
        res.writeHead(squareRes.statusCode, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Content-Type': 'application/json'
        });
        res.end(JSON.stringify(jsonResponse));
      });
    });

    squareReq.on('error', (error) => {
      res.writeHead(500, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ error: error.message }));
    });

    squareReq.write(multipartBody);
    squareReq.end();
  } catch (error) {
    res.writeHead(500, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ error: error.message || 'Error creando imagen en Square' }));
  }
}

async function lookupBarcodeInOpenFoodFacts(searchTerm) {
  try {
    const endpoint = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(searchTerm)}&search_simple=1&action=process&json=1&page_size=8`;
    const response = await httpRequest(endpoint);

    if (response.statusCode !== 200) {
      return null;
    }

    let parsed;
    try {
      parsed = JSON.parse(response.body);
    } catch (error) {
      return null;
    }

    const products = Array.isArray(parsed.products) ? parsed.products : [];
    for (const product of products) {
      const barcode = normalizeBarcode(product.code || product._id || '');
      if (barcode) {
        return {
          barcode,
          source: 'OpenFoodFacts',
          raw: {
            productName: product.product_name || '',
            brands: product.brands || ''
          }
        };
      }
    }

    return null;
  } catch (error) {
    console.warn('OpenFoodFacts no disponible:', error.message);
    return null;
  }
}

// Extraer marca/fabricante del nombre del producto
function extractBrandFromName(productName) {
  if (!productName) return null;
  
  // Lista de marcas conocidas (puedes expandir esto)
  const knownBrands = [
    'Havana Club', 'Bacardi', 'Captain Morgan', 'Absolut', 'Smirnoff',
    'Johnnie Walker', 'Jack Daniel\'s', 'Coca-Cola', 'Pepsi', 'Fanta',
    'Nestle', 'Kellogg\'s', 'Heinz', 'Campbell\'s', 'Unilever',
    'P&G', 'Procter & Gamble', 'Colgate', 'Palmolive', 'Gillette'
  ];
  
  const nameLower = productName.toLowerCase();
  for (const brand of knownBrands) {
    if (nameLower.includes(brand.toLowerCase())) {
      return brand;
    }
  }
  
  // Si no encuentra marca conocida, tomar las primeras 2-3 palabras como posible marca
  const words = productName.trim().split(/\s+/);
  if (words.length >= 2) {
    return words.slice(0, 2).join(' ');
  }
  
  return words[0] || null;
}

// Identificar categoría del producto
function identifyProductCategory(name, description) {
  const text = `${name} ${description}`.toLowerCase();
  
  if (text.match(/\b(ron|whisky|whiskey|vodka|tequila|gin|cerveza|beer|wine|vino|licor|alcohol|bebida alcohólica)\b/)) {
    return 'beverages_alcoholic';
  }
  if (text.match(/\b(comida|alimento|food|grocery|supermercado|arroz|frijol|harina|azucar|aceite)\b/)) {
    return 'food';
  }
  if (text.match(/\b(limpieza|detergente|jabon|shampoo|crema|cosmetico)\b/)) {
    return 'personal_care';
  }
  
  return 'general';
}

// Buscar código de barras en sitio oficial del fabricante (web scraping)
async function lookupBarcodeInManufacturerSite(brand, productName) {
  if (!brand) return null;
  
  try {
    // Mapeo de marcas a sus sitios oficiales
    const brandSites = {
      'Havana Club': 'https://www.havana-club.com',
      'Bacardi': 'https://www.bacardi.com',
      'Coca-Cola': 'https://www.coca-cola.com',
      'Pepsi': 'https://www.pepsi.com'
    };
    
    const site = brandSites[brand];
    if (!site) return null;
    
    // Buscar en el sitio oficial usando búsqueda
    const searchUrl = `${site}/search?q=${encodeURIComponent(productName)}`;
    console.log(`🔍 Buscando en sitio oficial de ${brand}: ${searchUrl}`);
    
    // Intentar obtener HTML y buscar códigos de barras en meta tags o JSON-LD
    const response = await httpRequest(searchUrl, { timeout: 8000 });
    
    if (response.statusCode === 200) {
      // Buscar GTIN/UPC/EAN en el HTML
      const html = response.body;
      
      // Buscar en JSON-LD estructurado
      const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/is);
      if (jsonLdMatch) {
        try {
          const jsonLd = JSON.parse(jsonLdMatch[1]);
          if (jsonLd.gtin13 || jsonLd.gtin12 || jsonLd.gtin8) {
            const barcode = normalizeBarcode(jsonLd.gtin13 || jsonLd.gtin12 || jsonLd.gtin8);
            if (barcode) {
              return {
                barcode,
                source: `Sitio oficial ${brand}`,
                raw: { productName: jsonLd.name || productName }
              };
            }
          }
        } catch (e) {
          // Ignorar errores de parsing
        }
      }
      
      // Buscar en meta tags
      const gtinMatch = html.match(/<meta[^>]*(?:gtin|upc|ean|barcode)[^>]*content=["']([^"']+)["']/i);
      if (gtinMatch) {
        const barcode = normalizeBarcode(gtinMatch[1]);
        if (barcode) {
          return {
            barcode,
            source: `Sitio oficial ${brand}`,
            raw: { productName }
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.warn(`Error buscando en sitio oficial de ${brand}:`, error.message);
    return null;
  }
}

// Buscar en Google Shopping (usando búsqueda web estructurada)
async function lookupBarcodeInGoogleShopping(productName, brand) {
  try {
    // Construir query de búsqueda específica
    const query = brand ? `${brand} ${productName} UPC barcode` : `${productName} UPC barcode GTIN`;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=shop`;
    
    console.log(`🛒 Buscando en Google Shopping: ${query}`);
    
    const response = await httpRequest(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    if (response.statusCode === 200) {
      const html = response.body;
      
      // Buscar códigos de barras en el HTML (Google Shopping a veces muestra GTIN)
      const gtinPatterns = [
        /GTIN[:\s]+(\d{8,14})/i,
        /UPC[:\s]+(\d{8,14})/i,
        /EAN[:\s]+(\d{8,14})/i,
        /barcode[:\s]+(\d{8,14})/i,
        /"gtin":\s*"(\d{8,14})"/i,
        /"upc":\s*"(\d{8,14})"/i
      ];
      
      for (const pattern of gtinPatterns) {
        const match = html.match(pattern);
        if (match) {
          const barcode = normalizeBarcode(match[1]);
          if (barcode) {
            return {
              barcode,
              source: 'Google Shopping',
              raw: { productName, brand }
            };
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.warn('Google Shopping no disponible:', error.message);
    return null;
  }
}

async function lookupBarcodeInUpcItemDb(searchTerm) {
  try {
    const endpoint = `https://api.upcitemdb.com/prod/trial/search?s=${encodeURIComponent(searchTerm)}`;
    const response = await httpRequest(endpoint, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.statusCode !== 200) {
      return null;
    }

    let parsed;
    try {
      parsed = JSON.parse(response.body);
    } catch (error) {
      return null;
    }

    const items = Array.isArray(parsed.items) ? parsed.items : [];
    for (const item of items) {
      const barcode = normalizeBarcode(item.upc || item.ean || item.gtin || '');
      if (barcode) {
        return {
          barcode,
          source: 'UPCItemDB',
          raw: {
            title: item.title || '',
            brand: item.brand || ''
          }
        };
      }
    }

    return null;
  } catch (error) {
    console.warn('UPCItemDB no disponible:', error.message);
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  if (req.url.startsWith('/api/square/v2/catalog/images') && req.method === 'POST') {
    handleCreateCatalogImageProxy(req, res);
    return;
  }

  if (req.url.startsWith('/api/square')) {
    proxyToSquare(req, res);
    return;
  }

  if (req.url === '/api/barcode-lookup' && req.method === 'POST') {
    try {
      const rawBody = await readRequestBody(req);
      let body = {};
      try {
        body = rawBody ? JSON.parse(rawBody) : {};
      } catch (parseError) {
        res.writeHead(400, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ error: 'JSON invalido en la solicitud' }));
        return;
      }

      const name = String(body.name || '').trim();
      const description = String(body.description || '').trim();
      const sku = String(body.sku || '').trim();

      if (!name && !sku) {
        res.writeHead(400, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ error: 'Se requiere nombre o SKU para buscar codigo' }));
        return;
      }

      // 1. Extraer marca/fabricante del nombre
      const brand = extractBrandFromName(name);
      const category = identifyProductCategory(name, description);
      
      console.log(`🔍 Búsqueda de código de barras:`);
      console.log(`   Producto: ${name}`);
      console.log(`   Marca detectada: ${brand || 'No detectada'}`);
      console.log(`   Categoría: ${category}`);

      // 2. PRIORIDAD 1: Buscar en sitio oficial del fabricante (si se detectó marca)
      if (brand) {
        console.log(`   🔎 Buscando en sitio oficial de ${brand}...`);
        const fromManufacturer = await lookupBarcodeInManufacturerSite(brand, name);
        if (fromManufacturer?.barcode) {
          console.log(`   ✅ Código encontrado en sitio oficial: ${fromManufacturer.barcode}`);
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify(fromManufacturer));
          return;
        }
      }

      // 3. PRIORIDAD 2: Buscar en Google Shopping (especialmente útil para productos conocidos)
      console.log(`   🛒 Buscando en Google Shopping...`);
      const fromGoogleShopping = await lookupBarcodeInGoogleShopping(name, brand);
      if (fromGoogleShopping?.barcode) {
        console.log(`   ✅ Código encontrado en Google Shopping: ${fromGoogleShopping.barcode}`);
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(fromGoogleShopping));
        return;
      }

      // 4. PRIORIDAD 3: Buscar en bases de datos especializadas por categoría
      const candidates = [];
      if (name) candidates.push(name);
      if (brand && name) candidates.push(`${brand} ${name}`);
      if (name && sku) candidates.push(`${name} ${sku}`);
      if (sku) candidates.push(sku);
      if (name && description) {
        candidates.push(`${name} ${description.split(' ').slice(0, 8).join(' ')}`);
      }

      const uniqueCandidates = [...new Set(candidates.filter(Boolean))].slice(0, 4);

      // Para bebidas alcohólicas, priorizar UPCItemDB
      if (category === 'beverages_alcoholic') {
        for (const term of uniqueCandidates) {
          const fromUpcItemDb = await lookupBarcodeInUpcItemDb(term);
          if (fromUpcItemDb?.barcode) {
            console.log(`   ✅ Código encontrado en UPCItemDB: ${fromUpcItemDb.barcode}`);
            res.writeHead(200, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify(fromUpcItemDb));
            return;
          }
        }
      }

      // Para alimentos, priorizar OpenFoodFacts
      if (category === 'food') {
        for (const term of uniqueCandidates) {
          const fromOpenFoodFacts = await lookupBarcodeInOpenFoodFacts(term);
          if (fromOpenFoodFacts?.barcode) {
            console.log(`   ✅ Código encontrado en OpenFoodFacts: ${fromOpenFoodFacts.barcode}`);
            res.writeHead(200, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify(fromOpenFoodFacts));
            return;
          }
        }
      }

      // 5. Último recurso: Buscar en todas las bases de datos disponibles
      for (const term of uniqueCandidates) {
        const fromOpenFoodFacts = await lookupBarcodeInOpenFoodFacts(term);
        if (fromOpenFoodFacts?.barcode) {
          console.log(`   ✅ Código encontrado en OpenFoodFacts: ${fromOpenFoodFacts.barcode}`);
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify(fromOpenFoodFacts));
          return;
        }

        const fromUpcItemDb = await lookupBarcodeInUpcItemDb(term);
        if (fromUpcItemDb?.barcode) {
          console.log(`   ✅ Código encontrado en UPCItemDB: ${fromUpcItemDb.barcode}`);
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify(fromUpcItemDb));
          return;
        }
      }

      console.log(`   ❌ No se encontró código en ninguna fuente`);
      res.writeHead(404, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ error: 'No se encontro codigo en fuentes externas' }));
      return;
    } catch (error) {
      console.error('❌ Error en barcode lookup:', error);
      res.writeHead(500, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ error: error.message || 'Error interno en barcode lookup' }));
      return;
    }
  }

  // Proxy para extraer datos de URLs (web scraping)
  if (req.url.startsWith('/api/proxy')) {
    const parsedUrl = url.parse(req.url, true);
    const targetUrl = parsedUrl.query.url;
    
    console.log('🔗 Proxy request:', req.url);
    console.log('🎯 Target URL:', targetUrl);
    
    if (!targetUrl) {
      res.writeHead(400, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ error: 'URL parameter is required' }));
      return;
    }
    
    try {
      const targetParsed = url.parse(targetUrl);
      
      if (!targetParsed.hostname) {
        res.writeHead(400, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ error: 'Invalid URL format' }));
        return;
      }
      
      const isHttps = targetParsed.protocol === 'https:';
      const httpModule = isHttps ? https : http;
      
      const options = {
        hostname: targetParsed.hostname,
        port: targetParsed.port || (isHttps ? 443 : 80),
        path: targetParsed.path || '/',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Referer': targetUrl
        },
        timeout: 15000 // 15 segundos de timeout
      };
      
      console.log('📡 Making request to:', `${targetParsed.protocol}//${targetParsed.hostname}${targetParsed.path}`);
      
      const proxyReq = httpModule.request(options, (proxyRes) => {
        let responseStream = proxyRes;
        const encoding = proxyRes.headers['content-encoding'];
        
        // Manejar compresión
        if (encoding === 'gzip') {
          responseStream = zlib.createGunzip();
          proxyRes.pipe(responseStream);
        } else if (encoding === 'deflate') {
          responseStream = zlib.createInflate();
          proxyRes.pipe(responseStream);
        }
        
        let data = '';
        
        responseStream.on('data', (chunk) => {
          data += chunk.toString();
        });
        
        responseStream.on('end', () => {
          res.writeHead(proxyRes.statusCode, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': proxyRes.headers['content-type'] || 'text/html; charset=utf-8'
          });
          res.end(data);
        });
        
        responseStream.on('error', (error) => {
          console.error('❌ Error en stream:', error.message);
          if (!res.headersSent) {
            res.writeHead(500, { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({ error: `Error procesando respuesta: ${error.message}` }));
          }
        });
      });
      
      proxyReq.on('error', (error) => {
        console.error('❌ Error en proxy de URL:', error.message);
        res.writeHead(500, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ error: `Error al acceder a la URL: ${error.message}` }));
      });
      
      proxyReq.on('timeout', () => {
        console.error('⏱️ Timeout en proxy de URL');
        proxyReq.destroy();
        res.writeHead(504, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ error: 'Timeout al acceder a la URL' }));
      });
      
      proxyReq.setTimeout(10000);
      proxyReq.end();
    } catch (error) {
      console.error('❌ Error procesando URL:', error.message);
      res.writeHead(500, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ error: `Error procesando URL: ${error.message}` }));
    }
    return;
  }

  // Limpiar la URL (remover query params para archivos estáticos)
  const parsedUrl = url.parse(req.url);
  let filePath = '.' + parsedUrl.pathname;
  
  // Si es la raíz, servir index.html
  if (filePath === './' || filePath === './index.html') {
    filePath = './index.html';
  }
  
  // Si el archivo no tiene extensión, intentar agregar .html
  if (!path.extname(filePath) && !fs.existsSync(filePath)) {
    const htmlPath = filePath + '.html';
    if (fs.existsSync(htmlPath)) {
      filePath = htmlPath;
    }
  }

  serveStaticFile(filePath, res);
});

server.listen(PORT, () => {
  console.log(`🚀 Tropiplus Supermarket corriendo en http://localhost:${PORT}`);
  console.log(`📡 Proxy de Square API disponible en /api/square`);
});
