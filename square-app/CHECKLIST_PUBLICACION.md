# ✅ Checklist de Publicación - Square App Marketplace

## 📋 ANTES DE PUBLICAR - Verifica Todo

### 1. ✅ Configuración OAuth en Square Developer

- [ ] App creada en: https://developer.squareup.com/apps
- [ ] Application ID copiado: `sq0idp-1soiZa2SKukDWOuzVG9QAA`
- [ ] Application Secret guardado (en Supabase Secrets)
- [ ] Redirect URI configurado: `https://landerlopez1992-cyber.github.io/tropiplussupermarket/square-app/oauth-callback.html`
- [ ] Scopes seleccionados:
  - [ ] `ORDERS_READ`
  - [ ] `ORDERS_WRITE`
  - [ ] `INVENTORY_READ`
  - [ ] `INVENTORY_WRITE`
  - [ ] `ITEMS_READ`
  - [ ] `ITEMS_WRITE`
  - [ ] `CUSTOMERS_READ`
  - [ ] `CUSTOMERS_WRITE`

### 2. ✅ Supabase Edge Function

- [ ] Función `square-oauth` desplegada
- [ ] Secrets configurados:
  - [ ] `SQUARE_APPLICATION_ID`
  - [ ] `SQUARE_APPLICATION_SECRET`
  - [ ] `SQUARE_ENVIRONMENT` = `production`

### 3. ✅ Código de la App

- [ ] `square-app/js/square-oauth.js` → Application ID actualizado
- [ ] `square-app/index.html` → Funciona correctamente
- [ ] App probada en navegador
- [ ] OAuth flow funciona (conectar → autorizar → conectar)

### 4. ✅ App en GitHub Pages

- [ ] App subida a GitHub
- [ ] GitHub Pages habilitado
- [ ] URL funciona: `https://landerlopez1992-cyber.github.io/tropiplussupermarket/square-app/`
- [ ] OAuth callback funciona: `https://landerlopez1992-cyber.github.io/tropiplussupermarket/square-app/oauth-callback.html`

---

## 🚀 PASOS PARA PUBLICAR

### Paso 1: Acceder a Square Developer Dashboard

1. Ve a: **https://developer.squareup.com/apps**
2. Inicia sesión
3. Selecciona tu app: **"TropiParts"**

### Paso 2: Crear App Marketplace Listing

1. En el menú lateral, ve a **"App Marketplace"**
2. Haz clic en **"Create Listing"** o **"Crear Listado"**
3. Si no aparece, ve a: **https://developer.squareup.com/apps/[TU_APP_ID]/marketplace**

### Paso 3: Completar Información Básica

**App Name:**
```
TropiParts
```

**Short Description (Descripción Corta - 160 caracteres máximo):**
```
Gestión simplificada de inventario y pedidos. Interfaz fácil optimizada para terminales POS.
```

**Long Description (Descripción Larga):**
```
TropiParts es una aplicación diseñada para simplificar la gestión de inventario y pedidos en tu negocio.

Características principales:
• Gestión de inventario en tiempo real
• Visualización y gestión de pedidos y remesas
• Interfaz intuitiva optimizada para pantallas táctiles
• Actualización de stock con un solo clic
• Filtros y búsqueda avanzada
• Sin necesidad de login adicional - usa la sesión de Square

Perfecta para comercios que buscan una alternativa más simple y fácil de usar que la interfaz nativa de Square.
```

**Category (Categoría):**
- Selecciona: **"Inventory Management"** o **"Business Operations"**

**Tags (Etiquetas):**
```
inventario, pedidos, gestión, POS, terminal, fácil, simple, remesas
```

### Paso 4: Detalles de la App

**App URL (URL de la App):**
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

### Paso 5: Get Started (Cómo Empezar)

**Instructions (Instrucciones):**
```
1. Haz clic en "Conectar con Square"
2. Autoriza la aplicación con tu cuenta de Square
3. Comienza a gestionar tu inventario y pedidos

La aplicación se conecta automáticamente y está lista para usar. No requiere configuración adicional.
```

### Paso 6: Pricing (Precios)

**Pricing Model:**
- Selecciona: **"Free"** (si es gratuita)

**Price:**
- Si es gratuita: `$0.00`

### Paso 7: Brand and Images (Marca e Imágenes)

**App Icon (Icono de la App):**
- Tamaño: **512x512 px**
- Formato: **PNG**
- Sube el logo de Tropiplus

**Screenshots (Capturas de Pantalla):**
Necesitas al menos **3-5 screenshots**:

1. **Pantalla de conexión/inicio**
   - Muestra el botón "Conectar con Square"
   - Tamaño: 1280x720 px o 1920x1080 px

2. **Vista de inventario**
   - Muestra productos con stock
   - Tamaño: 1280x720 px o 1920x1080 px

3. **Vista de pedidos**
   - Muestra lista de pedidos
   - Tamaño: 1280x720 px o 1920x1080 px

4. **Edición de inventario**
   - Muestra modal de actualización
   - Tamaño: 1280x720 px o 1920x1080 px

5. **Vista de remesas** (opcional)
   - Muestra remesas entrantes
   - Tamaño: 1280x720 px o 1920x1080 px

**Banner Image (Imagen de Banner):**
- Tamaño: **1200x300 px**
- Formato: **PNG o JPG**
- Diseño con logo y texto "TropiParts"

### Paso 8: Support Information (Información de Soporte)

**Support Email:**
```
tallercell0133@gmail.com
```

**Support Phone (Opcional):**
```
(Deja en blanco si no tienes)
```

### Paso 9: Revisar y Enviar

1. **Revisa toda la información:**
   - [ ] Información básica completa
   - [ ] URLs funcionan correctamente
   - [ ] Screenshots se ven bien
   - [ ] Descripción clara y sin errores
   - [ ] Categoría y tags correctos

2. **Haz clic en "Submit for Review"** o **"Enviar para Revisión"**

3. **Espera la aprobación:**
   - Square revisará tu aplicación
   - Puede tomar varios días
   - Recibirás notificaciones por email

---

## 📸 Cómo Crear Screenshots

### Opción 1: Desde el Navegador

1. Abre la app en el navegador: `https://landerlopez1992-cyber.github.io/tropiplussupermarket/square-app/`
2. Usa herramientas de captura:
   - **Chrome DevTools**: F12 → Toggle device toolbar → Selecciona tamaño
   - **Extensiones**: Full Page Screen Capture
   - **Herramientas del sistema**: Cmd+Shift+4 (Mac) o Snipping Tool (Windows)

### Opción 2: Herramientas Online

- **Screenshot.guru**: https://screenshot.guru
- **BrowserStack**: Para capturas de diferentes dispositivos

### Tamaños Recomendados:
- **Screenshots**: 1280x720 px o 1920x1080 px
- **Icono**: 512x512 px
- **Banner**: 1200x300 px

---

## ⚠️ Errores Comunes a Evitar

1. **Redirect URI no coincide:**
   - Debe ser EXACTAMENTE igual en Square y en el código
   - Incluye `https://` completo

2. **URLs no funcionan:**
   - Verifica que GitHub Pages esté habilitado
   - Verifica que los archivos estén en la rama correcta

3. **OAuth no funciona:**
   - Verifica Secrets en Supabase
   - Verifica Application ID en el código

4. **Screenshots de mala calidad:**
   - Usa resolución alta
   - Muestra funcionalidades claramente

---

## ✅ Después de Enviar

1. **Revisa tu email** para confirmación
2. **Espera la revisión** (puede tomar 3-7 días)
3. **Responde a solicitudes** de Square si las hay
4. **Una vez aprobada**, la app aparecerá en App Marketplace

---

## 📞 Si Necesitas Ayuda

- **Square Developer Support**: https://developer.squareup.com/docs
- **Square Developer Forums**: https://developer.squareup.com/forums
- **Square Developer Discord**: https://discord.com/invite/squaredev

---

¡Listo para publicar! 🚀
