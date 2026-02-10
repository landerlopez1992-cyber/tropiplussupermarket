// @ts-nocheck
// Supabase Edge Function para proxy de Square API
// Esta función actúa como proxy entre el frontend y Square API

const SQUARE_API_BASE = 'https://connect.squareup.com';
const SQUARE_ACCESS_TOKEN = Deno.env.get('SQUARE_ACCESS_TOKEN') || 
  'EAAAl2nJjLDUfcBLy2EIXc7ipUq3Pwkr3PcSji6oC1QmgtUK5E8UyeICc0mbowZB';

Deno.serve(async (req) => {
  // Habilitar CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Manejar preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Obtener el path desde la URL
    // La URL será: https://fbbvfzeyhhopdwzsooew.supabase.co/functions/v1/square-proxy/v2/catalog/search
    const url = new URL(req.url);
    
    // El pathname será: /functions/v1/square-proxy/v2/catalog/search
    // Necesitamos extraer: /v2/catalog/search
    let squareEndpoint = '';
    
    // Buscar el path después de /square-proxy/
    const pathMatch = url.pathname.match(/\/square-proxy\/(.+)$/);
    
    if (pathMatch && pathMatch[1]) {
      // Asegurar que empiece con /
      squareEndpoint = pathMatch[1].startsWith('/') ? pathMatch[1] : '/' + pathMatch[1];
    } else {
      // Si no se encuentra, intentar desde query params
      const queryPath = url.searchParams.get('path');
      if (queryPath) {
        squareEndpoint = queryPath.startsWith('/') ? queryPath : '/' + queryPath;
      } else {
        // Si no hay path, devolver error 400
        return new Response(
          JSON.stringify({
            error: 'Missing endpoint path',
            message: 'Please provide a Square API endpoint path. Example: /v2/catalog/search',
            receivedPathname: url.pathname,
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }

    const squareUrl = `${SQUARE_API_BASE}${squareEndpoint}`;
    
    console.log('[Square Proxy] URL details:', {
      originalUrl: req.url,
      pathname: url.pathname,
      squareEndpoint,
      squareUrl
    });

    // Preparar headers para Square
    const headers = {
      'Square-Version': '2024-01-18',
      'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    };

    // Square Catalog Search requires POST. If request comes as GET from browser
    // URL tests, convert it automatically to POST with a safe default payload.
    const normalizedMethod =
      req.method === 'GET' && squareEndpoint === '/v2/catalog/search'
        ? 'POST'
        : req.method;

    // Preparar opciones para la petición
    const options: RequestInit = {
      method: normalizedMethod,
      headers: headers,
    };

    // Si hay body, incluirlo
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      const body = await req.text();
      if (body) {
        options.body = body;
      }
    }

    // Fallback body para pruebas manuales GET en navegador a /v2/catalog/search
    if (
      normalizedMethod === 'POST' &&
      squareEndpoint === '/v2/catalog/search' &&
      !options.body
    ) {
      options.body = JSON.stringify({
        object_types: ['CATEGORY', 'ITEM'],
        include_related_objects: true,
      });
    }

    console.log(`[Square Proxy] ${normalizedMethod} ${squareUrl}`);

    // Hacer la petición a Square
    const response = await fetch(squareUrl, options);
    
    // Leer la respuesta
    const data = await response.json();

    // Retornar la respuesta con CORS headers
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[Square Proxy Error]', error);
    return new Response(
      JSON.stringify({
        error: 'Error en el proxy de Square',
        message: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
