// Vercel Serverless Function para proxy genérico de URLs externas

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const targetUrl = req.query.url;

    if (!targetUrl) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    console.log(`[URL Proxy] Fetching: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
      },
      timeout: 10000,
    });

    const html = await response.text();
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (error) {
    console.error('[URL Proxy Error]', error);
    res.status(500).json({ 
      error: 'Error al acceder a la URL', 
      message: error.message 
    });
  }
}
