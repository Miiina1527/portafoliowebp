# Portafolio — servidor simple


Este repositorio implementa una galería pública (museo digital) y un servidor Node/Express que lista y sirve archivos públicos.

Estructura:
- `index.html`, `script.js`, `style.css` — frontend orientado a mostrar archivos públicos
- `uploads/` — coloca aquí las carpetas y archivos que quieras publicar
- `server.js` — servidor Express que expone `/api/downloads` y sirve archivos en `/files/*`

Instalación y ejecución:

```bash
npm install
npm start
# luego abre http://localhost:3000/index.html
```

Notas:
- Coloca manualmente las carpetas/archivos dentro de `uploads/` para que sean públicos.
- Si quieres permitir que usuarios suban archivos desde la web, puedo añadir endpoints con `multer` y autenticación.
