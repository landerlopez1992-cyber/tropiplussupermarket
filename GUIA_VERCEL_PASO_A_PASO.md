# 📋 GUÍA PASO A PASO - VERCEL DEPLOY

## 🎯 Configuración Actual en la Imagen

Veo que estás en la página de Vercel con:
- ✅ Repositorio: `landerlopez1992-cyber/tropiplussupermarket`
- ✅ Project Name: `tropiplussupermarket`
- ⚠️ Root Directory: `./` (NECESITA CAMBIO)
- ⚠️ Environment Variables: Colapsado (NECESITA CONFIGURARSE)

---

## 📝 PASOS A SEGUIR (En Orden)

### 1️⃣ CAMBIAR ROOT DIRECTORY

**Ubicación:** Campo "Root Directory" (debajo de "Application Preset")

**Acción:**
1. Haz clic en el botón **"Edit"** al lado de `./`
2. O simplemente **borra** `./` y escribe: `supermarket23`
3. Presiona Enter o haz clic fuera del campo

**Resultado esperado:** El campo debe mostrar `supermarket23`

---

### 2️⃣ AGREGAR VARIABLE DE ENTORNO

**Ubicación:** Sección "Environment Variables" (debajo de "Root Directory")

**Acción:**
1. Haz clic en **"> Environment Variables"** para expandirla
2. Haz clic en **"Add"** o **"Add Variable"**
3. Completa:
   - **Name (o Key):** `SQUARE_ACCESS_TOKEN`
   - **Value:** `EAAAl2nJjLDUfcBLy2EIXc7ipUq3Pwkr3PcSji6oC1QmgtUK5E8UyeICc0mbowZB`
4. Haz clic en **"Save"** o **"Add"**

**Resultado esperado:** Debes ver la variable listada en la sección

---

### 3️⃣ VERIFICAR BUILD SETTINGS (Opcional)

**Ubicación:** Sección "Build and Output Settings"

**Acción:**
- Puedes dejarla colapsada (está bien así)
- O expandirla para verificar que no haya configuraciones que interfieran

---

### 4️⃣ DESPLEGAR

**Ubicación:** Botón negro "Deploy" al final de la página

**Acción:**
1. Haz clic en **"Deploy"**
2. Espera 1-2 minutos mientras Vercel:
   - Clona el repositorio
   - Instala dependencias
   - Construye las funciones serverless
   - Despliega el proyecto

**Resultado esperado:** 
- Verás un progreso de deploy
- Al finalizar, verás una URL como: `https://tropiplussupermarket.vercel.app`

---

## ✅ DESPUÉS DEL DEPLOY

Una vez que Vercel termine:

1. **Copia la URL** que te da (ejemplo: `https://tropiplussupermarket.vercel.app`)
2. **Verifica que funciona:**
   - Ve a: https://landerlopez1992-cyber.github.io/tropiplussupermarket/
   - Abre la consola del navegador (F12)
   - Deberías ver mensajes como: `📡 Intentando proxy: https://tropiplussupermarket.vercel.app`
   - Los productos deberían cargarse

---

## 🆘 SI ALGO FALLA

### Error en el Deploy:
- Revisa que el Root Directory sea exactamente `supermarket23` (sin espacios)
- Verifica que la variable de entorno esté correctamente escrita

### Los productos no cargan:
- Abre la consola del navegador (F12)
- Busca mensajes de error
- Verifica que la URL de Vercel esté funcionando: `https://tropiplussupermarket.vercel.app/api/square/v2/catalog/search`

---

## 📞 CHECKLIST FINAL

Antes de hacer clic en "Deploy", verifica:

- [ ] Root Directory = `supermarket23`
- [ ] Environment Variable agregada: `SQUARE_ACCESS_TOKEN`
- [ ] Project Name = `tropiplussupermarket` (o el que prefieras)
- [ ] Application Preset = `Other` (está bien así)

**¡Listo para hacer clic en "Deploy"!** 🚀
