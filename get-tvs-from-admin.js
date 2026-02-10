// Script para obtener los TVs del admin y actualizar tvs-public.json
// Ejecutar en la consola del navegador cuando estés en admin.html

(function() {
    const TV_STORAGE_KEY = 'tropiplus_tv_configs';
    const tvs = JSON.parse(localStorage.getItem(TV_STORAGE_KEY) || '[]');
    
    console.log('📺 TVs encontrados en admin:', tvs.length);
    console.log('📋 Datos:', JSON.stringify(tvs, null, 2));
    
    if (tvs.length === 0) {
        console.log('❌ No hay TVs guardados en el admin');
        console.log('💡 Ve a Admin > TV y crea/guarda un TV primero');
        return;
    }
    
    // Copiar al portapapeles
    const jsonContent = JSON.stringify(tvs, null, 2);
    navigator.clipboard.writeText(jsonContent).then(() => {
        console.log('✅ JSON copiado al portapapeles');
        console.log('💡 Ahora ejecuta en terminal:');
        console.log('cd /Users/cubcolexpress/Desktop/Proyectos/Tropiplus/supermarket23');
        console.log('cat > tvs-public.json << \'EOF\'');
        console.log(jsonContent);
        console.log('EOF');
        console.log('git add tvs-public.json');
        console.log('git commit -m "Actualizar TVs desde admin"');
        console.log('git push');
    }).catch(err => {
        console.error('Error copiando:', err);
        console.log('📋 Copia manualmente este JSON:');
        console.log(jsonContent);
    });
})();
