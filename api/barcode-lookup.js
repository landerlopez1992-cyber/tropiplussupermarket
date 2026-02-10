// Vercel Serverless Function para búsqueda de códigos de barras

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, type } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Buscar en OpenFoodFacts
    try {
      const ofUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=8`;
      const ofResponse = await fetch(ofUrl);
      const ofData = await ofResponse.json();

      if (ofData.products && ofData.products.length > 0) {
        const product = ofData.products[0];
        if (product.code) {
          return res.status(200).json({ 
            success: true, 
            gtin: product.code,
            source: 'OpenFoodFacts',
            product: product.product_name
          });
        }
      }
    } catch (e) {
      console.log('OpenFoodFacts no disponible, intentando UPCItemDB');
    }

    // Buscar en UPCItemDB
    try {
      const upcUrl = `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(query)}`;
      const upcResponse = await fetch(upcUrl);
      const upcData = await upcResponse.json();

      if (upcData.code === 'OK' && upcData.items && upcData.items.length > 0) {
        const item = upcData.items[0];
        if (item.upc) {
          return res.status(200).json({ 
            success: true, 
            gtin: item.upc,
            source: 'UPCItemDB',
            product: item.title
          });
        }
      }
    } catch (e) {
      console.log('UPCItemDB no disponible');
    }

    return res.status(200).json({ 
      success: false, 
      message: 'No se encontró código de barras' 
    });
  } catch (error) {
    console.error('[Barcode Lookup Error]', error);
    res.status(500).json({ 
      error: 'Error en búsqueda de código de barras', 
      message: error.message 
    });
  }
}
