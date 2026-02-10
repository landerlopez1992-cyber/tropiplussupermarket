// Script para actualizar automáticamente tvs-public.json
// Ejecutar desde la consola del navegador en admin.html después de guardar un TV

(function() {
    const TV_STORAGE_KEY = 'tropiplus_tv_configs';
    const tvs = JSON.parse(localStorage.getItem(TV_STORAGE_KEY) || '[]');
    
    if (tvs.length === 0) {
        console.log('❌ No hay TVs guardados');
        return;
    }
    
    const jsonContent = JSON.stringify(tvs, null, 2);
    console.log('📋 JSON generado:', jsonContent);
    
    // Copiar al portapapeles
    navigator.clipboard.writeText(jsonContent).then(() => {
        console.log('✅ JSON copiado al portapapeles');
        console.log('💡 Ahora ejecuta en terminal:');
        console.log('cd supermarket23');
        console.log('echo \'' + jsonContent.replace(/'/g, "'\\''") + '\' > tvs-public.json');
        console.log('git add tvs-public.json');
        console.log('git commit -m "Auto-update TVs"');
        console.log('git push');
    }).catch(err => {
        console.error('Error copiando:', err);
        console.log('📋 Copia manualmente este JSON:');
        console.log(jsonContent);
    });
})();
