// Vercel Serverless Function para proxy de Square API
// Maneja todas las rutas: /api/square/*

const SQUARE_API_BASE = 'https://connect.squareup.com';
const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN || 'EAAAl2nJjLDUfcBLy2EIXc7ipUq3Pwkr3PcSji6oC1QmgtUK5E8UyeICc0mbowZB';

export default async function handler(req, res) {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Obtener el path completo desde los parámetros
    // Vercel pasa el path como array en req.query.path
    let squareEndpoint = '';
    
    if (req.query.path) {
      if (Array.isArray(req.query.path)) {
        squareEndpoint = '/' + req.query.path.join('/');
      } else {
        squareEndpoint = '/' + req.query.path;
      }
    } else {
      // Si no hay path en query, intentar desde la URL
      const urlPath = req.url.replace('/api/square', '');
      squareEndpoint = urlPath || '/';
    }
    
    // Asegurar que el endpoint empiece con /
    if (!squareEndpoint.startsWith('/')) {
      squareEndpoint = '/' + squareEndpoint;
    }
    
    const squareUrl = `${SQUARE_API_BASE}${squareEndpoint}`;

    // Preparar headers para Square
    const headers = {
      'Square-Version': '2024-01-18',
      'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    };

    // Opciones para la petición a Square
    const options = {
      method: req.method,
      headers: headers,
    };

    // Si hay body, incluirlo
    if (req.body && Object.keys(req.body).length > 0) {
      options.body = JSON.stringify(req.body);
    }

    console.log(`[Square Proxy] ${req.method} ${squareUrl}`);

    // Hacer la petición a Square
    const response = await fetch(squareUrl, options);
    
    // Leer la respuesta
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }

    // Retornar la respuesta con el mismo status code
    res.status(response.status).json(data);
  } catch (error) {
    console.error('[Square Proxy Error]', error);
    res.status(500).json({ 
      error: 'Error en el proxy de Square', 
      message: error.message 
    });
  }
}
