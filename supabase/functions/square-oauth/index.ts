// Supabase Edge Function para intercambiar código OAuth de Square por access token
// IMPORTANTE: Configura estas variables en Supabase Dashboard > Settings > Edge Functions > Secrets

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Manejar CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, redirect_uri } = await req.json()

    if (!code || !redirect_uri) {
      return new Response(
        JSON.stringify({ error: 'Faltan parámetros: code y redirect_uri son requeridos' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Obtener credenciales desde variables de entorno
    const applicationId = Deno.env.get('SQUARE_APPLICATION_ID')
    const applicationSecret = Deno.env.get('SQUARE_APPLICATION_SECRET')
    const environment = Deno.env.get('SQUARE_ENVIRONMENT') || 'production'

    if (!applicationId || !applicationSecret) {
      console.error('❌ Faltan credenciales de Square en variables de entorno')
      return new Response(
        JSON.stringify({ error: 'Configuración del servidor incompleta' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // URL base según el environment
    const baseUrl = environment === 'production' 
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com'

    // Intercambiar código por access token
    const tokenResponse = await fetch(`${baseUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-18'
      },
      body: JSON.stringify({
        client_id: applicationId,
        client_secret: applicationSecret,
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      })
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}))
      console.error('❌ Error de Square OAuth:', errorData)
      return new Response(
        JSON.stringify({ 
          error: 'Error intercambiando código por token',
          details: errorData.errors?.[0]?.detail || 'Error desconocido'
        }),
        { 
          status: tokenResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const tokenData = await tokenResponse.json()

    // Obtener información de locations
    let locationId = null
    if (tokenData.access_token) {
      try {
        const locationsResponse = await fetch(`${baseUrl}/v2/locations`, {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Square-Version': '2024-01-18'
          }
        })

        if (locationsResponse.ok) {
          const locationsData = await locationsResponse.json()
          locationId = locationsData.locations?.[0]?.id || null
        }
      } catch (error) {
        console.warn('⚠️ No se pudo obtener location_id:', error)
      }
    }

    // Retornar datos (sin incluir client_secret)
    return new Response(
      JSON.stringify({
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        merchant_id: tokenData.merchant_id,
        location_id: locationId,
        refresh_token: tokenData.refresh_token
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Error en square-oauth:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Error interno del servidor',
        message: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
