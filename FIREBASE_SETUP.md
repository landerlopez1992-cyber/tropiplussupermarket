# Firebase — TropiParts

Proyecto ya detectado: **tropiplus-supermarket-dm26hn** (plan Spark free).

## Lo que ya está en el código

En `js/firebase-config.js` ya quedó:

- `projectId`, `authDomain`, `storageBucket`, `messagingSenderId`, `appId`

## Única pieza que falta (30 segundos)

1. En Firebase Console (donde estás ahora), arriba del código elige la pestaña **Configuración** (no "npm").
2. Verás algo como:

```js
apiKey: "AIzaSy...."
```

3. Cópiala y pégala aquí en el chat, o ábrela en `js/firebase-config.js` y reemplaza `PEGAR_API_KEY`.

## Firestore

1. Menú izquierdo → **Firestore Database** → crear si no existe.
2. Reglas:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## Nombre y logo

- Marca: **TropiParts**
- Logo 3D: `images/logo.png`
