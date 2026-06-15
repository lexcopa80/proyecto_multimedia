# Plataforma Multimedia Interactiva - UMSA

Este repositorio contiene el desarrollo del Laboratorio de Multimedia, integrando un sistema dinámico de trámites universitarios, entornos tridimensionales interactivos en WebGL, reconstrucción de avatares mediante fotogrametría y algoritmos de procesamiento digital de imágenes a nivel de píxel.

## 👥 Integrantes
*Copa Mamani Lex Edson
*Cruz Quispe Nancy		
*Guarachi Arguala  Alberth		


---

## 🌐 Plataforma Web Funcional (GitHub Pages)

La plataforma multimedia se encuentra desplegada de forma estática en la nube y puede ser accedida a través del siguiente enlace:
👉 **[Link del Proyecto Multimedia](https://lexcopa80.github.io/proyecto_multimedia/)**

---

## 🛠️ Estructura del Repositorio

El proyecto se encuentra modularizado para aislar los entornos grupales de las entregas individuales:

```text
proyecto_multimedia/
│
├── workFlow/               #WORKFLOW Hacerlo correr localmente con node.js
├── tramites_json/          # Módulo grupal: Sistema de Trámites Universitarios (BPM)
│   ├── data/               # Persistencia de datos simulada en archivos JSON
│   ├── img/                # Recursos visuales del sistema
│   ├── app.js              # Lógica del Frontend con interceptación de solicitudes
│   ├── estilos.css         # Estilos visuales del sistema de trámites
│   └── index.html          # Interfaz de usuario del sistema de trámites
│├── coreografia.glb         # Modelo 3D de la coreografía grupal Unity
├── fotogra.glb             # Modelo 3D de fotogrametría grupal
├── index.html              # Menú Principal e interfaz integradora del grupo
├── script.js               # Lógica de pestañas del menú principal
└── mymusic.mp3             # Pista de audio de la coreografía grupal


Para probar y validar el proyecto completo en un entorno local de desarrollo:

Clonar este repositorio en su máquina local:

Bash
git clone [https://github.com/lexcopa80/proyecto_multimedia.git](https://github.com/lexcopa80/proyecto_multimedia.git)
Abrir la carpeta del proyecto en Visual Studio Code.

Asegurarse de tener instalada la extensión Live Server.

Abrir el archivo index.html principal (raíz) y hacer clic en el botón "Go Live" en la barra inferior de VS Code.

El proyecto se desplegará en su navegador predeterminado bajo la dirección local http://127.0.0.1:5500/index.html, permitiendo la navegación interactiva a través de todas las secciones del laboratorio.
------------------------------------------------------------------
!!!!!!!!!WORKFLOW¡¡¡¡¡¡¡¡¡¡¡¡
Sistema UMSA con JSON
Sistema web local para los tramites de:

Inscripcion de materias.
Emision de certificados.
El proyecto usa almacenamiento en archivos JSON, por lo que no necesita una base de datos tradicional.

Como probarlo desde GitHub
Clona el repositorio desde GitHub.
Entra a la carpeta del proyecto.
Verifica que tengas Node.js instalado.
Ejecuta:
npm start
Abre http://localhost:3000 en el navegador.
Publicarlo en GitHub
Si quieres subir este proyecto a GitHub desde esta carpeta, usa estos comandos:

git init
git add .
git commit -m "Sistema UMSA con JSON"
git branch -M main
git remote add origin https://github.com/tu-usuario/tu-repositorio.git
git push -u origin main
Si ya tienes un repositorio creado, solo cambia la URL del remoto por la tuya.

Credenciales de prueba
RU: 1707441
Contraseña: 12345
Con ese usuario puedes entrar como administrador y probar:

Inscripcion de materias.
Emision de certificados.
Panel de administracion para cambiar fechas de inscripcion.
Creacion y actualizacion de materias y paralelos.
Recomendaciones para la prueba
Probar primero el login con las credenciales de arriba.
Luego entrar a "Inscripcion de materias" para validar requisitos y cupos.
Despues ir a "Certificaciones" para registrar la solicitud y generar el PDF.
Finalmente usar "Administracion" para crear materias o modificar el cronograma.
Nota
Este sistema no se puede abrir directamente con GitHub Pages porque necesita ejecutar server.js. Si quieres publicarlo en linea, debes usar un servicio que soporte Node.js.
