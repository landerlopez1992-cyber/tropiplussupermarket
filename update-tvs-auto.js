// Script Node.js para actualizar automáticamente tvs-public.json
// Se ejecuta cuando se detecta un cambio en localStorage del admin
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const TVS_FILE = path.join(__dirname, 'tvs-public.json');
const STORAGE_FILE = path.join(__dirname, '.tvs-storage.json');

function updatePublicFile() {
    try {
        if (!fs.existsSync(STORAGE_FILE)) {
            console.log('No hay cambios pendientes');
            return;
        }
        
        const content = fs.readFileSync(STORAGE_FILE, 'utf8');
        const tvs = JSON.parse(content);
        
        // Filtrar solo activos y normalizar
        const activeTvs = tvs.filter(tv => tv && tv.active !== false);
        
        // Escribir archivo público
        fs.writeFileSync(TVS_FILE, JSON.stringify(activeTvs, null, 2));
        
        // Git commit y push
        execSync('git add tvs-public.json', { cwd: __dirname, stdio: 'inherit' });
        execSync(`git commit -m "Auto-update TVs: ${activeTvs.map(t => t.name).join(', ')}"`, { cwd: __dirname, stdio: 'inherit' });
        execSync('git push', { cwd: __dirname, stdio: 'inherit' });
        
        // Limpiar archivo temporal
        fs.unlinkSync(STORAGE_FILE);
        
        console.log('✅ Archivo público actualizado automáticamente');
    } catch (error) {
        console.error('Error actualizando archivo público:', error);
    }
}

updatePublicFile();
