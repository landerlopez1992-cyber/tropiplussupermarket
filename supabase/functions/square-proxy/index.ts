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
    // La URL será: https://tu-proyecto.supabase.co/functions/v1/square-proxy/v2/catalog/search
    const url = new URL(req.url);
    const pathMatch = url.pathname.match(/\/square-proxy\/(.+)$/);
    
    let squareEndpoint = '';
    if (pathMatch && pathMatch[1]) {
      squareEndpoint = '/' + pathMatch[1];
    } else {
      // Si no hay path, usar endpoint por defecto
      squareEndpoint = '/v2/catalog/search';
    }

    const squareUrl = `${SQUARE_API_BASE}${squareEndpoint}`;

    // Preparar headers para Square
    const headers = {
      'Square-Version': '2024-01-18',
      'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    };

    // Preparar opciones para la petición
    const options: RequestInit = {
      method: req.method,
      headers: headers,
    };

    // Si hay body, incluirlo
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      const body = await req.text();
      if (body) {
        options.body = body;
      }
    }

    console.log(`[Square Proxy] ${req.method} ${squareUrl}`);

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
