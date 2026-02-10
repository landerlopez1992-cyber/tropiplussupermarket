# 🔧 SOLUCIÓN: Error "Repository name already in use" en Vercel

## ❌ El Problema
Vercel está intentando crear un **nuevo repositorio Git** con el nombre "tropiplussupermarket", pero ese nombre ya existe.

## ✅ SOLUCIÓN RÁPIDA

### Opción 1: Cambiar el nombre del repositorio privado (RECOMENDADO)

1. En la página de Vercel donde ves el error
2. **Cambia el nombre** en "Private Repository Name" a algo diferente, por ejemplo:
   - `tropiplussupermarket-vercel`
   - `tropiplussupermarket-proxy`
   - `tropiplussupermarket-deploy`
   - O simplemente **deja el campo vacío** si no necesitas un repo privado

3. Haz clic en **"Create"**

### Opción 2: Importar sin crear nuevo repositorio

1. En lugar de "New Project", busca **"Import Project"**
2. Selecciona el repositorio existente: `landerlopez1992-cyber/tropiplussupermarket`
3. Configura:
   - **Root Directory:** `supermarket23`
   - **Framework Preset:** Other (o deja en blanco)
4. Agrega la variable de entorno:
   - Nombre: `SQUARE_ACCESS_TOKEN`
   - Valor: `EAAAl2nJjLDUfcBLy2EIXc7ipUq3Pwkr3PcSji6oC1QmgtUK5E8UyeICc0mbowZB`
5. Haz clic en **"Deploy"**

### Opción 3: Usar el repositorio existente directamente

1. En la página de Vercel, busca un botón o opción que diga **"Use existing repository"** o **"Skip"** para el repositorio Git
2. O simplemente **borra el texto** del campo "Private Repository Name" y déjalo vacío
3. Vercel usará el repositorio de GitHub que ya está conectado

---

## 🎯 PASOS RECOMENDADOS (Más Fácil)

1. **Cambia el nombre** en "Private Repository Name" a: `tropiplussupermarket-proxy`
2. **Root Directory:** `supermarket23`
3. **Environment Variables:**
   - `SQUARE_ACCESS_TOKEN` = `EAAAl2nJjLDUfcBLy2EIXc7ipUq3Pwkr3PcSji6oC1QmgtUK5E8UyeICc0mbowZB`
4. **Haz clic en "Create"**

---

## ✅ Después del Deploy

Una vez que Vercel termine de desplegar:
- ✅ Te dará una URL como: `https://tropiplussupermarket.vercel.app`
- ✅ El código ya está configurado para usar esta URL automáticamente
- ✅ Los productos y el texto promocional se cargarán correctamente

---

## 🆘 Si sigue sin funcionar

1. Ve a tu dashboard de Vercel: https://vercel.com/dashboard
2. Busca si ya existe un proyecto llamado "tropiplussupermarket"
3. Si existe, úsalo o elimínalo primero
4. Luego crea uno nuevo con un nombre diferente
