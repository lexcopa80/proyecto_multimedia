function cambiarPestana(idSeccion) {
    // 1. Ocultar todas las secciones
    const secciones = document.querySelectorAll('.seccion-contenido');
    secciones.forEach(sec => sec.classList.remove('active'));

    // 2. Quitar estado activo a los botones del menú
    const botones = document.querySelectorAll('.nav-btn');
    botones.forEach(btn => btn.classList.remove('active'));

    // 3. Mostrar la sección seleccionada
    document.getElementById(idSeccion).classList.add('active');

    // 4. Activar el botón correspondiente en el menú de la UMSA
    const botonActivo = Array.from(botones).find(btn => btn.getAttribute('onclick').includes(idSeccion));
    if (botonActivo) botonActivo.classList.add('active');

    // --- CONTROL DE AUDIO AL CAMBIAR DE PESTAÑA ---
    const musica = document.getElementById('musicaAutoplay');
    
    // Si el usuario se mueve a cualquier pestaña que NO sea 'unity', apagamos la música
    if (idSeccion !== 'unity') {
        if (musica) {
            musica.pause(); 
            // Opcional: Si quieres que la canción vuelva a empezar desde cero la próxima vez, descomenta la línea de abajo:
            // musica.currentTime = 0; 
        }
    }
}
// --- SISTEMA WEBGL PARA LA COREOGRAFÍA CON MÚSICA ---
let escCoreo, camCoreo, renCoreo, conCoreo, relojCoreo, mezcladorCoreo, audioCoreo;
// Detectar cuando el usuario interactúa con el visor 3D de la coreografía
document.getElementById('gltf-coreografia').addEventListener('click', function() {
    const musica = document.getElementById('musicaAutoplay');
    if (musica && musica.paused) {
        musica.play().catch(e => console.log("Error al reproducir el audio:", e));
    }
});

// Iniciar cuando la página esté lista
