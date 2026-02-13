// @ts-nocheck
// Supabase Edge Function para proxy de Square API
// Esta función actúa como proxy entre el frontend y Square API

const SQUARE_API_BASE = 'https://connect.squareup.com';
const SQUARE_ACCESS_TOKEN = Deno.env.get('SQUARE_ACCESS_TOKEN') || 
  'EAAAl2nJjLDUfcBLy2EIXc7ipUq3Pwkr3PcSji6oC1QmgtUK5E8UyeICc0mbowZB';

function parseDataUrl(dataUrl: string) {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const mimeType = match[1];
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return {
    mimeType,
    bytes
  };
}

async function handleCreateCatalogImage(
  squareUrl: string,
  bodyText: string,
  headersBase: Record<string, string>
) {
  const payload = bodyText ? JSON.parse(bodyText) : {};
  const idempotencyKey = payload.idempotency_key || `img_key_${Date.now()}`;
  const objectId = payload.object_id || undefined;
  const imageName = payload.image_name || 'Imagen Producto';
  const imageUrl = payload.image_url || '';
  const imageDataUrl = payload.image_data_url || '';

  let fileBlob: Blob | null = null;
  let filename = 'product-image.jpg';

  if (imageUrl) {
    const downloaded = await fetch(imageUrl);
    if (!downloaded.ok) {
      throw new Error(`No se pudo descargar imagen externa (${downloaded.status})`);
    }
    const mimeType = downloaded.headers.get('content-type') || 'image/jpeg';
    if (mimeType.includes('png')) filename = 'product-image.png';
    if (mimeType.includes('gif')) filename = 'product-image.gif';
    if (mimeType.includes('webp')) filename = 'product-image.webp';
    const bytes = await downloaded.arrayBuffer();
    fileBlob = new Blob([bytes], { type: mimeType });
  } else if (imageDataUrl) {
    const parsed = parseDataUrl(imageDataUrl);
    if (!parsed) {
      throw new Error('Formato de image_data_url inválido');
    }
    if (parsed.mimeType.includes('png')) filename = 'product-image.png';
    if (parsed.mimeType.includes('gif')) filename = 'product-image.gif';
    if (parsed.mimeType.includes('webp')) filename = 'product-image.webp';
    fileBlob = new Blob([parsed.bytes], { type: parsed.mimeType || 'image/jpeg' });
  } else {
    throw new Error('Debes enviar image_url o image_data_url');
  }

  const requestPayload: any = {
    idempotency_key: idempotencyKey,
    image: {
      type: 'IMAGE',
      id: '#TMP_IMAGE',
      image_data: {
        name: imageName
      }
    }
  };
  if (objectId) {
    requestPayload.object_id = objectId;
  }

  const formData = new FormData();
  formData.append('request', JSON.stringify(requestPayload));
  formData.append('file', fileBlob, filename);

  const squareHeaders: Record<string, string> = {
    'Square-Version': headersBase['Square-Version'],
    'Authorization': headersBase['Authorization']
  };

  return fetch(squareUrl, {
    method: 'POST',
    headers: squareHeaders,
    body: formData
  });
}

// Log del token (solo primeros y últimos caracteres para seguridad)
if (!SQUARE_ACCESS_TOKEN || SQUARE_ACCESS_TOKEN.length < 10) {
  console.error('[Square Proxy] ⚠️ SQUARE_ACCESS_TOKEN no está configurado o es inválido');
} else {
  const tokenPreview = `${SQUARE_ACCESS_TOKEN.substring(0, 10)}...${SQUARE_ACCESS_TOKEN.substring(SQUARE_ACCESS_TOKEN.length - 10)}`;
  console.log('[Square Proxy] ✅ Token configurado:', tokenPreview);
}

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
    // El pathname puede ser: /functions/v1/square-proxy/v2/catalog/search
    // O simplemente: /square-proxy/v2/catalog/search
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
        // Si no hay path, devolver error 400 en lugar de usar default
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
    if (!SQUARE_ACCESS_TOKEN || SQUARE_ACCESS_TOKEN.length < 10) {
      console.error('[Square Proxy] ❌ SQUARE_ACCESS_TOKEN no válido');
      return new Response(
        JSON.stringify({
          error: 'Configuration error',
          message: 'SQUARE_ACCESS_TOKEN no está configurado correctamente en Supabase Secrets',
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
    
    const headers: Record<string, string> = {
      'Square-Version': '2024-01-18',
      'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    };
    
    console.log('[Square Proxy] Headers preparados:', {
      'Square-Version': headers['Square-Version'],
      'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN.substring(0, 10)}...`,
      'Content-Type': headers['Content-Type']
    });

    // Square Catalog Search requires POST. If the request comes from a browser
    // URL test (GET), we transparently convert it to POST with a safe default.
    const normalizedMethod =
      req.method === 'GET' && squareEndpoint === '/v2/catalog/search'
        ? 'POST'
        : req.method;

    // Leer body una sola vez para reutilizarlo (incluye casos especiales)
    let requestBodyText = '';
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      requestBodyText = await req.text();
    }

    // Caso especial: CreateCatalogImage requiere multipart/form-data en Square.
    // El frontend envía image_url/image_data_url en JSON y el proxy lo transforma.
    if (
      normalizedMethod === 'POST' &&
      squareEndpoint === '/v2/catalog/images' &&
      requestBodyText
    ) {
      const squareImageResponse = await handleCreateCatalogImage(squareUrl, requestBodyText, headers);
      const responseText = await squareImageResponse.text();
      let data: any;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        data = { raw: responseText };
      }

      return new Response(JSON.stringify(data), {
        status: squareImageResponse.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    // Preparar opciones para la petición genérica
    const options: RequestInit = {
      method: normalizedMethod,
      headers: headers,
    };

    // Si hay body, incluirlo
    if (requestBodyText) {
      options.body = requestBodyText;
    }

    // Fallback body for manual GET tests to /v2/catalog/search in the browser
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
