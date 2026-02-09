// Servidor Proxy para Square API - Supermarket23
const http = require('http');
const https = require('https');
const url = require('url');
const path = require('path');
const fs = require('fs');

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
    res.writeHead(squareRes.statusCode, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    });

    squareRes.pipe(res);
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

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  if (req.url.startsWith('/api/square')) {
    proxyToSquare(req, res);
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
  console.log(`🚀 Supermarket23 corriendo en http://localhost:${PORT}`);
  console.log(`📡 Proxy de Square API disponible en /api/square`);
});
