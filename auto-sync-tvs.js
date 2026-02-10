// Script para sincronizar automáticamente tvs-public.json
// Se ejecuta cada vez que se guarda un TV en el admin
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const TVS_FILE = path.join(__dirname, 'tvs-public.json');
const STORAGE_KEY = 'tropiplus_tv_configs';

// Leer desde localStorage simulado (en realidad vendría del admin)
// Por ahora, leemos desde un archivo temporal que el admin puede crear
const TEMP_FILE = path.join(__dirname, '.tvs-temp.json');

if (fs.existsSync(TEMP_FILE)) {
    try {
        const content = fs.readFileSync(TEMP_FILE, 'utf8');
        const tvs = JSON.parse(content);
        
        // Filtrar solo activos
        const activeTvs = tvs.filter(tv => tv && tv.active !== false);
        
        // Escribir archivo público
        fs.writeFileSync(TVS_FILE, JSON.stringify(activeTvs, null, 2));
        
        // Git commit y push
        execSync('git add tvs-public.json', { cwd: __dirname, stdio: 'inherit' });
        execSync(`git commit -m "Auto-update TVs: ${activeTvs.map(t => t.name).join(', ')}"`, { cwd: __dirname, stdio: 'inherit' });
        execSync('git push', { cwd: __dirname, stdio: 'inherit' });
        
        // Limpiar archivo temporal
        fs.unlinkSync(TEMP_FILE);
        
        console.log('✅ Archivo público actualizado automáticamente');
    } catch (error) {
        console.error('Error actualizando archivo público:', error);
    }
} else {
    console.log('No hay cambios pendientes');
}
