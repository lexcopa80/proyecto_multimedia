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
