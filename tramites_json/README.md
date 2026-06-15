# Sistema UMSA con JSON

Sistema web local para los tramites de:

1. Inscripcion de materias.
2. Emision de certificados.

El proyecto usa almacenamiento en archivos JSON, por lo que no necesita una base de datos tradicional.

## Como probarlo desde GitHub

1. Clona el repositorio desde GitHub.
2. Entra a la carpeta del proyecto.
3. Verifica que tengas Node.js instalado.
4. Ejecuta:

```bash
npm start
```

5. Abre `http://localhost:3000` en el navegador.

## Publicarlo en GitHub

Si quieres subir este proyecto a GitHub desde esta carpeta, usa estos comandos:

```bash
git init
git add .
git commit -m "Sistema UMSA con JSON"
git branch -M main
git remote add origin https://github.com/tu-usuario/tu-repositorio.git
git push -u origin main
```

Si ya tienes un repositorio creado, solo cambia la URL del remoto por la tuya.

## Credenciales de prueba

- RU: 1707441
- Contraseña: 12345

Con ese usuario puedes entrar como administrador y probar:

- Inscripcion de materias.
- Emision de certificados.
- Panel de administracion para cambiar fechas de inscripcion.
- Creacion y actualizacion de materias y paralelos.

## Recomendaciones para la prueba

- Probar primero el login con las credenciales de arriba.
- Luego entrar a "Inscripcion de materias" para validar requisitos y cupos.
- Despues ir a "Certificaciones" para registrar la solicitud y generar el PDF.
- Finalmente usar "Administracion" para crear materias o modificar el cronograma.

## Nota

Este sistema no se puede abrir directamente con GitHub Pages porque necesita ejecutar `server.js`.
Si quieres publicarlo en linea, debes usar un servicio que soporte Node.js.