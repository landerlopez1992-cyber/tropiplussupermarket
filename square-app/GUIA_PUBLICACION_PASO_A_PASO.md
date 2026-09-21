# 🚀 Guía Paso a Paso: Publicar en Square App Marketplace

## 📋 PASO 1: Crear la Aplicación en Square Developer Dashboard

### 1.1 Acceder al Dashboard
1. Ve a: **https://developer.squareup.com/apps**
2. Inicia sesión con tu cuenta de Square
3. Si no tienes cuenta, créala en: **https://squareup.com/signup**

### 1.2 Crear Nueva Aplicación
1. Haz clic en el botón **"Create App"** o **"Nueva Aplicación"**
2. Completa el formulario:
   - **App Name**: `TropiParts`
   - **Description**: `Gestión simplificada de inventario y pedidos para comercios. Interfaz fácil de usar optimizada para terminales POS.`
   - **Category**: Selecciona **"Inventory Management"** o **"Business Operations"**
   - **App Type**: Selecciona **"Web Application"**
3. Haz clic en **"Create"** o **"Crear"**

### 1.3 Guardar Credenciales
Después de crear la app, verás:
- **Application ID** (Application ID) - ⚠️ **CÓPIALO AHORA**
- **Application Secret** (Application Secret) - ⚠️ **CÓPIALO Y GUÁRDALO SEGURO**

---

## 📋 PASO 2: Configurar OAuth

### 2.1 Ir a Configuración OAuth
1. En el dashboard de tu app, ve a la sección **"OAuth"** en el menú lateral
2. Haz clic en **"OAuth Settings"** o **"Configuración OAuth"**

### 2.2 Configurar Redirect URI
1. En el campo **"Redirect URI"**, agrega:
   ```
   https://landerlopez1992-cyber.github.io/tropiplussupermarket/square-app/oauth-callback.html
   ```
   ⚠️ **IMPORTANTE**: Si tienes un dominio personalizado, úsalo en lugar de GitHub Pages

2. Haz clic en **"Add"** o **"Agregar"**

### 2.3 Seleccionar Scopes (Permisos)
Marca los siguientes scopes:
- ✅ `ORDERS_READ` - Leer pedidos
- ✅ `ORDERS_WRITE` - Crear/modificar pedidos
- ✅ `INVENTORY_READ` - Leer inventario
- ✅ `INVENTORY_WRITE` - Modificar inventario
- ✅ `ITEMS_READ` - Leer productos
- ✅ `ITEMS_WRITE` - Crear/modificar productos
- ✅ `CUSTOMERS_READ` - Leer clientes
- ✅ `CUSTOMERS_WRITE` - Crear/modificar clientes

### 2.4 Guardar Configuración
1. Haz clic en **"Save"** o **"Guardar"**
2. Verifica que todo esté guardado correctamente

---

## 📋 PASO 3: Configurar Supabase Edge Function

### 3.1 Acceder a Supabase
1. Ve a: **https://supabase.com/dashboard**
2. Inicia sesión
3. Selecciona tu proyecto (o créalo si no existe)

### 3.2 Verificar Edge Function
1. Ve a **"Edge Functions"** en el menú lateral
2. Verifica que existe la función `square-oauth`
3. Si no existe, créala:
   - Haz clic en **"Create a new function"**
   - Nombre: `square-oauth`
   - Copia el código de `supabase/functions/square-oauth/index.ts`

### 3.3 Configurar Secrets
1. Ve a **Settings** → **Edge Functions** → **Secrets**
2. Agrega los siguientes secrets:

   **Secret 1:**
   - **Name**: `SQUARE_APPLICATION_ID`
   - **Value**: (Pega tu Application ID del Paso 1.3)

   **Secret 2:**
   - **Name**: `SQUARE_APPLICATION_SECRET`
   - **Value**: (Pega tu Application Secret del Paso 1.3)

   **Secret 3:**
   - **Name**: `SQUARE_ENVIRONMENT`
   - **Value**: `production` (o `sandbox` para pruebas)

3. Haz clic en **"Save"** para cada secret

### 3.4 Desplegar Edge Function
1. Abre la terminal
2. Navega a tu proyecto:
   ```bash
   cd /Users/cubcolexpress/Desktop/Proyectos/Tropiplus/supermarket23
   ```
3. Despliega la función:
   ```bash
   supabase functions deploy square-oauth
   ```
4. Verifica que se desplegó correctamente

---

## 📋 PASO 4: Actualizar Código de la App

### 4.1 Actualizar Application ID
1. Abre el archivo: `square-app/js/square-oauth.js`
2. Busca la línea:
   ```javascript
   applicationId: 'sq0idp-1soiZa2SKukDWOuzVG9QAA',
   ```
3. Reemplázala con tu Application ID real:
   ```javascript
   applicationId: 'TU_APPLICATION_ID_AQUI',
   ```
4. Guarda el archivo

### 4.2 Verificar Redirect URI
1. En el mismo archivo, verifica que el `redirectUri` coincida con el configurado en Square:
   ```javascript
   redirectUri: window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/oauth-callback.html'),
   ```
   O si prefieres hardcodearlo:
   ```javascript
   redirectUri: 'https://landerlopez1992-cyber.github.io/tropiplussupermarket/square-app/oauth-callback.html',
   ```

### 4.3 Subir Cambios a GitHub
1. Abre la terminal
2. Ejecuta:
   ```bash
   cd /Users/cubcolexpress/Desktop/Proyectos/Tropiplus/supermarket23
   git add square-app/js/square-oauth.js
   git commit -m "Update Square Application ID for App Marketplace"
   git push
   ```
3. Espera a que GitHub Pages actualice (1-2 minutos)

---

## 📋 PASO 5: Probar la App en Sandbox

### 5.1 Cambiar a Sandbox
1. En Square Developer Dashboard, ve a tu app
2. Cambia el environment a **"Sandbox"** (si no estás en producción)
3. Actualiza el secret `SQUARE_ENVIRONMENT` en Supabase a `sandbox`

### 5.2 Probar OAuth Flow
1. Abre la app en el navegador:
   ```
   https://landerlopez1992-cyber.github.io/tropiplussupermarket/square-app/
   ```
2. Haz clic en **"Conectar con Square"**
3. Deberías ser redirigido a Square para autorizar
4. Autoriza la aplicación
5. Deberías ser redirigido de vuelta a la app
6. Verifica que aparezca **"Conectado"** en verde

### 5.3 Probar Funcionalidades
1. Ve a la pestaña **"Inventario"**
2. Verifica que se carguen los productos
3. Intenta editar el inventario de un producto
4. Ve a la pestaña **"Pedidos"**
5. Verifica que se muestren los pedidos
6. Prueba todas las funcionalidades

### 5.4 Si hay errores
- Revisa la consola del navegador (F12)
- Verifica que los Secrets en Supabase estén correctos
- Verifica que el Redirect URI coincida exactamente
- Verifica que los Scopes estén seleccionados

---

## 📋 PASO 6: Preparar para Producción

### 6.1 Cambiar a Producción
1. En Square Developer Dashboard, cambia a **"Production"**
2. Actualiza el secret `SQUARE_ENVIRONMENT` en Supabase a `production`
3. Obtén el **Production Access Token** (si lo necesitas para pruebas)

### 6.2 Probar en Producción
1. Repite el Paso 5.2 y 5.3 pero en producción
2. Verifica que todo funcione correctamente

---

## 📋 PASO 7: Crear App Marketplace Listing

### 7.1 Acceder a App Marketplace
1. En Square Developer Dashboard, ve a **"App Marketplace"**
2. Haz clic en **"Create Listing"** o **"Crear Listado"**

### 7.2 Información Básica (Basic Information)

**App Name:**
```
TropiParts
```

**Short Description (Descripción Corta):**
```
Gestión simplificada de inventario y pedidos para tu negocio. Interfaz fácil de usar optimizada para terminales POS.
```

**Long Description (Descripción Larga):**
```
TropiParts es una aplicación diseñada para simplificar la gestión de inventario y pedidos en tu negocio. 

Características principales:
• Gestión de inventario en tiempo real
• Visualización y gestión de pedidos y remesas
• Interfaz intuitiva optimizada para pantallas táctiles
• Agregar y modificar productos fácilmente
• Actualización de stock con un solo clic
• Filtros y búsqueda avanzada

Perfecta para comercios que buscan una alternativa más simple y fácil de usar que la interfaz nativa de Square.
```

**Category (Categoría):**
- Selecciona: **"Inventory Management"** o **"Business Operations"**

**Tags (Etiquetas):**
```
inventario, pedidos, gestión, POS, terminal, fácil, simple
```

### 7.3 Detalles (Details)

**App URL:**
```
https://landerlopez1992-cyber.github.io/tropiplussupermarket/square-app/
```

**Support URL (URL de Soporte):**
```
https://landerlopez1992-cyber.github.io/tropiplussupermarket/contacto.html
```

**Privacy Policy URL (URL de Política de Privacidad):**
```
https://landerlopez1992-cyber.github.io/tropiplussupermarket/sobre-nosotros.html
```

**Terms of Service URL (URL de Términos de Servicio):**
```
https://landerlopez1992-cyber.github.io/tropiplussupermarket/sobre-nosotros.html
```

### 7.4 Get Started (Cómo Empezar)

**Instructions (Instrucciones):**
```
1. Haz clic en "Conectar con Square"
2. Autoriza la aplicación con tu cuenta de Square
3. Comienza a gestionar tu inventario y pedidos

La aplicación se conecta automáticamente y está lista para usar.
```

### 7.5 Pricing (Precios)

**Pricing Model:**
- Selecciona: **"Free"** (si es gratuita) o **"Paid"** (si es de pago)

**Price:**
- Si es gratuita: `$0.00`
- Si es de pago: Ingresa el precio

### 7.6 Brand and Images (Marca e Imágenes)

**App Icon (Icono de la App):**
- Tamaño: 512x512 px
- Formato: PNG
- Sube el logo de Tropiplus

**Screenshots (Capturas de Pantalla):**
Necesitas al menos 3-5 screenshots:
1. Pantalla de inicio/conexión
2. Vista de inventario
3. Vista de pedidos
4. Edición de inventario
5. Vista de productos

**Tamaño recomendado:** 1280x720 px o 1920x1080 px
**Formato:** PNG o JPG

**Banner Image (Imagen de Banner):**
- Tamaño: 1200x300 px
- Formato: PNG o JPG

### 7.7 Support Information (Información de Soporte)

**Support Email:**
```
tallercell0133@gmail.com
```

**Support Phone (Opcional):**
```
(Deja en blanco si no tienes)
```

---

## 📋 PASO 8: Revisar y Enviar

### 8.1 Revisar Todo
1. Revisa toda la información ingresada
2. Verifica que todas las URLs funcionen
3. Verifica que las imágenes se vean bien
4. Revisa la ortografía y gramática

### 8.2 Enviar para Revisión
1. Haz clic en **"Submit for Review"** o **"Enviar para Revisión"**
2. Square revisará tu aplicación (puede tomar varios días)
3. Recibirás notificaciones por email sobre el estado

### 8.3 Durante la Revisión
- Square puede pedirte cambios o aclaraciones
- Responde a tiempo a cualquier solicitud
- Mantén tu app funcionando correctamente

---

## 📋 PASO 9: Después de la Aprobación

### 9.1 App Publicada
Una vez aprobada:
- Tu app aparecerá en Square App Marketplace
- Los merchants podrán encontrarla y descargarla
- Aparecerá en el menú de aplicaciones de los terminales POS

### 9.2 Promoción
- Comparte el enlace de tu app
- Promociona en redes sociales
- Crea contenido sobre cómo usar la app

---

## ✅ Checklist Final

Antes de enviar, verifica:

- [ ] App creada en Square Developer Dashboard
- [ ] OAuth configurado con Redirect URI correcto
- [ ] Scopes seleccionados
- [ ] Application ID actualizado en código
- [ ] Supabase Edge Function configurada con Secrets
- [ ] App probada en sandbox
- [ ] App probada en producción
- [ ] App Marketplace Listing completado
- [ ] Screenshots preparados
- [ ] URLs de soporte funcionando
- [ ] Información completa y correcta
- [ ] Listo para enviar

---

## 🆘 Solución de Problemas

### Error: "Invalid redirect_uri"
- Verifica que el Redirect URI en Square coincida EXACTAMENTE con el del código
- Incluye el protocolo completo: `https://...`

### Error: "OAuth exchange failed"
- Verifica que los Secrets en Supabase estén correctos
- Verifica que la Edge Function esté desplegada
- Revisa los logs de Supabase

### La app no se conecta
- Abre la consola del navegador (F12)
- Revisa los errores
- Verifica que `square-oauth.js` esté cargado

### No aparecen productos/pedidos
- Verifica que los Scopes estén seleccionados
- Verifica que el merchant haya autorizado la app
- Revisa los permisos en Square Dashboard

---

## 📞 Soporte

Si tienes problemas:
1. Revisa la documentación de Square: https://developer.squareup.com/docs
2. Revisa los logs de Supabase
3. Contacta a Square Developer Support

---

¡Buena suerte con tu publicación! 🚀
