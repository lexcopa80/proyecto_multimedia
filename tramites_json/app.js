// ==========================================
// MOCK BASE DE DATOS EMULADA EN LOCALSTORAGE
// ==========================================
const datosIniciales = {
  usuarios: [
    {
      ru: '1707441',
      nombre: 'Alberth Guarachi Arguata',
      contrasena: '12345',
      rol: 'admin',
      carrera: 'Ingenieria de Sistemas',
      plan: '2025',
      materiasAprobadas: ['INF-101', 'MAT-101', 'COM-101'],
      deudaActiva: false,
      procesosPendientes: false
    }
  ],
  configuracion: {
    inscripcionActiva: true,
    fechaInicioInscripcion: '2026-06-01',
    fechaFinInscripcion: '2026-06-30',
    certificadosActivos: true
  },
  catalogo: [
    {
      codigo: 'INF-201',
      nombre: 'Programacion II',
      requisitos: ['INF-101'],
      paralelos: [
        { codigo: 'A', horario: 'Lun/Mie 08:00-10:00', cupoMaximo: 30, inscritos: 12 },
        { codigo: 'B', horario: 'Mar/Jue 10:00-12:00', cupoMaximo: 25, inscritos: 25 }
      ]
    },
    {
      codigo: 'MAT-201',
      nombre: 'Calculo II',
      requisitos: ['MAT-101'],
      paralelos: [
        { codigo: 'A', horario: 'Lun/Mie 10:00-12:00', cupoMaximo: 30, inscritos: 18 },
        { codigo: 'C', horario: 'Vie 08:00-11:00', cupoMaximo: 20, inscritos: 5 }
      ]
    },
    {
      codigo: 'ADM-150',
      nombre: 'Introduccion a la Administracion',
      requisitos: [],
      paralelos: [
        { codigo: 'A', horario: 'Mar/Jue 08:00-10:00', cupoMaximo: 40, inscritos: 9 }
      ]
    }
  ],
  inscripciones: [],
  certificados: []
};

// Asegurar que existan datos cargados en el LocalStorage
function iniciarBaseDatosLocal() {
  if (!localStorage.getItem('db_usuarios')) localStorage.setItem('db_usuarios', JSON.stringify(datosIniciales.usuarios));
  if (!localStorage.getItem('db_configuracion')) localStorage.setItem('db_configuracion', JSON.stringify(datosIniciales.configuracion));
  if (!localStorage.getItem('db_catalogo')) localStorage.setItem('db_catalogo', JSON.stringify(datosIniciales.catalogo));
  if (!localStorage.getItem('db_inscripciones')) localStorage.setItem('db_inscripciones', JSON.stringify(datosIniciales.inscripciones));
  if (!localStorage.getItem('db_certificados')) localStorage.setItem('db_certificados', JSON.stringify(datosIniciales.certificados));
}
iniciarBaseDatosLocal();

// Funciones Utilitarias de Persistencia Local
function dbLeer(clave) { return JSON.parse(localStorage.getItem(clave)); }
function dbGuardar(clave, datos) { localStorage.setItem(clave, JSON.stringify(datos)); }

// ==========================================
// LOGICA DE REEMPLAZO DEL SERVIDOR (BACKEND MOCK)
// ==========================================
const sesionesActivas = new Map();

function emularServidorNode(url, opciones) {
  const metodo = opciones.method || 'GET';
  const cuerpo = opciones.body ? JSON.parse(opciones.body) : {};
  
  // Extraer Token de las cabeceras simuladas
  let token = null;
  if (opciones.headers && opciones.headers.Authorization) {
    token = opciones.headers.Authorization.split(' ')[1];
  }
  let ruAutenticado = sesionesActivas.get(token) || (estadoApp.token ? sesionesActivas.get(estadoApp.token) : null);
  let usuarioAutenticado = dbLeer('db_usuarios').find(u => u.ru === ruAutenticado) || estadoApp.usuario;

  // 1. API LOGIN
  if (url === '/api/login' && metodo === 'POST') {
    const usuarios = dbLeer('db_usuarios');
    const user = usuarios.find(u => u.ru === String(cuerpo.ru).trim() && u.contrasena === String(cuerpo.contrasena).trim());
    if (!user) return { ok: false, status: 401, mensaje: 'Credenciales incorrectas' };
    
    const nuevoToken = 'TOKEN-' + Math.random().toString(36).substring(2).toUpperCase();
    sesionesActivas.set(nuevoToken, user.ru);
    return {
      ok: true,
      status: 200,
      token: nuevoToken,
      usuario: { ru: user.ru, nombre: user.nombre, rol: user.rol, carrera: user.carrera, plan: user.plan }
    };
  }

  // 2. API CATALOGO
  if (url === '/api/catalogo' && metodo === 'GET') {
    if (!usuarioAutenticado) return { ok: false, status: 401, mensaje: 'No autorizado' };
    return {
      ok: true,
      status: 200,
      catalogo: dbLeer('db_catalogo'),
      configuracion: dbLeer('db_configuracion'),
      usuario: usuarioAutenticado
    };
  }

  // 3. API INSCRIPCIONES (VALIDAR)
  if (url === '/api/inscripciones/validar' && metodo === 'POST') {
    const config = dbLeer('db_configuracion');
    const catalogo = dbLeer('db_catalogo');
    if (!config.inscripcionActiva) return { ok: false, status: 409, mensaje: 'No se habilita la inscripcion' };

    const materia = catalogo.find(m => m.codigo === cuerpo.codigoMateria);
    const paralelo = materia?.paralelos.find(p => p.codigo === cuerpo.codigoParalelo);
    if (!materia || !paralelo) return { ok: false, status: 409, mensaje: 'Materia o paralelo no encontrado' };

    const cumpleReq = materia.requisitos.every(req => usuarioAutenticado.materiasAprobadas.includes(req));
    if (!cumpleReq) return { ok: false, status: 409, mensaje: 'No cumple requisitos de aprobacion' };
    if (paralelo.inscritos >= paralelo.cupoMaximo) return { ok: false, status: 409, mensaje: 'Cupo lleno' };

    return { ok: true, status: 200, materia, paralelo };
  }

  // 4. API INSCRIPCIONES (CREAR)
  if (url === '/api/inscripciones' && metodo === 'POST') {
    const catalogo = dbLeer('db_catalogo');
    const inscripciones = dbLeer('db_inscripciones');
    
    const materia = catalogo.find(m => m.codigo === cuerpo.codigoMateria);
    const paralelo = materia?.paralelos.find(p => p.codigo === cuerpo.codigoParalelo);
    
    paralelo.inscritos += 1;
    const nuevaInscripcion = {
      id: 'INS-' + Math.floor(Math.random() * 10000),
      ru: usuarioAutenticado.ru,
      nombreEstudiante: usuarioAutenticado.nombre,
      codigoMateria: materia.codigo,
      nombreMateria: materia.nombre,
      codigoParalelo: paralelo.codigo,
      horario: paralelo.horario,
      estado: 'confirmada',
      fecha: new Date().toISOString()
    };
    
    inscripciones.push(nuevaInscripcion);
    dbGuardar('db_catalogo', catalogo);
    dbGuardar('db_inscripciones', inscripciones);
    return { ok: true, status: 201, mensaje: 'Inscripcion registrada con exito', inscripcion: nuevaInscripcion };
  }

  if (url === '/api/inscripciones' && metodo === 'GET') {
    const inscripciones = dbLeer('db_inscripciones');
    return { ok: true, status: 200, datos: inscripciones.filter(i => i.ru === usuarioAutenticado.ru) };
  }

  // 5. API CERTIFICADOS (VALIDAR Y CREAR)
  if (url === '/api/certificados/validar' && metodo === 'POST') {
    if (usuarioAutenticado.deudaActiva || usuarioAutenticado.procesosPendientes) {
      return { ok: false, status: 409, motivo: 'El estudiante tiene deudas o procesos pendientes en la UMSA' };
    }
    return { ok: true, status: 200, ok: true };
  }

  if (url === '/api/certificados' && metodo === 'POST') {
    const certificados = dbLeer('db_certificados');
    const nuevaSolicitud = {
      id: 'CER-' + Math.floor(Math.random() * 10000),
      ru: usuarioAutenticado.ru,
      nombreEstudiante: usuarioAutenticado.nombre,
      tipoCertificado: cuerpo.tipoCertificado,
      motivo: cuerpo.motivo || '',
      estado: 'pendiente_pago',
      pdfGenerado: false,
      fechaSolicitud: new Date().toISOString()
    };
    certificados.push(nuevaSolicitud);
    dbGuardar('db_certificados', certificados);
    return { ok: true, status: 201, mensaje: 'Solicitud registrada', solicitud: nuevaSolicitud };
  }

  if (url === '/api/certificados' && metodo === 'GET') {
    const certificados = dbLeer('db_certificados');
    return { ok: true, status: 200, datos: certificados.filter(c => c.ru === usuarioAutenticado.ru) };
  }

  // PAGO CERTIFICADO
  if (url.includes('/pago') && metodo === 'POST') {
    const certificados = dbLeer('db_certificados');
    const id = url.split('/')[3];
    const cert = certificados.find(c => c.id === id);
    if (cert) {
      cert.estado = 'emitido';
      cert.pdfGenerado = true;
    }
    dbGuardar('db_certificados', certificados);
    return { ok: true, status: 200, mensaje: 'Pago validado y certificado generado' };
  }

  // 6. ADMIN RESUMEN Y CONFIGURACIÓN
  if (url === '/api/admin/resumen' && metodo === 'GET') {
    return { ok: true, status: 200, configuracion: dbLeer('db_configuracion'), catalogo: dbLeer('db_catalogo'), usuario: usuarioAutenticado };
  }

  if (url === '/api/admin/configuracion' && metodo === 'POST') {
    dbGuardar('db_configuracion', cuerpo);
    return { ok: true, status: 200, mensaje: 'Configuracion actualizada' };
  }

  if (url === '/api/admin/usuarios' && metodo === 'GET') {
    const usuarios = dbLeer('db_usuarios');
    return { ok: true, status: 200, usuarios: usuarios.filter(u => u.rol !== 'admin') };
  }

  if (url === '/api/admin/usuarios' && metodo === 'POST') {
    const usuarios = dbLeer('db_usuarios');
    const nuevoU = {
      ru: cuerpo.ru,
      nombre: cuerpo.nombre,
      contrasena: cuerpo.contrasena,
      carrera: cuerpo.carrera,
      plan: cuerpo.plan,
      materiasAprobadas: cuerpo.materiasAprobadas ? cuerpo.materiasAprobadas.split(',') : [],
      deudaActiva: Boolean(cuerpo.deudaActiva),
      procesosPendientes: Boolean(cuerpo.procesosPendientes),
      rol: 'estudiante'
    };
    usuarios.push(nuevoU);
    dbGuardar('db_usuarios', usuarios);
    return { ok: true, status: 201, mensaje: 'Estudiante creado con exito', usuario: nuevoU };
  }

  if (url === '/api/admin/materias' && metodo === 'POST') {
    const catalogo = dbLeer('db_catalogo');
    let materia = catalogo.find(m => m.codigo === cuerpo.codigoMateria);
    if (!materia) {
      materia = { codigo: cuerpo.codigoMateria, nombre: cuerpo.nombreMateria, requisitos: cuerpo.requisitos ? cuerpo.requisitos.split(',') : [], paralelos: [] };
      catalogo.push(materia);
    }
    if (cuerpo.codigoParalelo) {
      materia.paralelos.push({ codigo: cuerpo.codigoParalelo, horario: cuerpo.horario || 'Sin horario', cupoMaximo: Number(cuerpo.cupoMaximo || 30), inscritos: 0 });
    }
    dbGuardar('db_catalogo', catalogo);
    return { ok: true, status: 200, mensaje: 'Materia actualizada' };
  }

  return { ok: false, status: 404, mensaje: 'Ruta no encontrada' };
}

// ==========================================
// CODIGO ORIGINAL MODIFICADO PARA INTEGRACIÓN FRONTEND
// ==========================================
const estadoApp = {
  token: localStorage.getItem('tokenTramites') || '',
  usuario: JSON.parse(localStorage.getItem('usuarioTramites') || 'null'),
  catalogo: [],
  configuracion: null,
  seccionActiva: 'inscripcion',
  inscripcionSeleccionada: null,
  certificadoActivo: null
};

const formLogin = document.getElementById('formLogin');
const mensajeLogin = document.getElementById('mensajeLogin');
const panelLogin = document.getElementById('panelLogin');
const panelPrincipal = document.getElementById('panelPrincipal');
const nombreUsuario = document.getElementById('nombreUsuario');
const detalleUsuario = document.getElementById('detalleUsuario');
const cerrarSesion = document.getElementById('cerrarSesion');
const selectMateria = document.getElementById('selectMateria');
const selectParalelo = document.getElementById('selectParalelo');
const infoInscripcion = document.getElementById('infoInscripcion');
const botonValidarInscripcion = document.getElementById('botonValidarInscripcion');
const botonConfirmarInscripcion = document.getElementById('botonConfirmarInscripcion');
const listaInscripciones = document.getElementById('listaInscripciones');
const estadoInscripcion = document.getElementById('estadoInscripcion');
const selectTipoCertificado = document.getElementById('selectTipoCertificado');
const campoMotivo = document.getElementById('campoMotivo');
const selectMetodoPago = document.getElementById('selectMetodoPago');
const infoCertificado = document.getElementById('infoCertificado');
const botonValidarCertificado = document.getElementById('botonValidarCertificado');
const botonCrearCertificado = document.getElementById('botonCrearCertificado');
const botonPagarCertificado = document.getElementById('botonPagarCertificado');
const listaCertificados = document.getElementById('listaCertificados');
const estadoCertificado = document.getElementById('estadoCertificado');
const botonIrInscripcion = document.getElementById('botonIrInscripcion');
const botonIrCertificaciones = document.getElementById('botonIrCertificaciones');
const botonIrAdministracion = document.getElementById('botonIrAdministracion');
const seccionInscripcion = document.getElementById('seccionInscripcion');
const seccionCertificaciones = document.getElementById('seccionCertificaciones');
const seccionAdministracion = document.getElementById('seccionAdministracion');
const panelCronograma = document.getElementById('panelCronograma');
const formConfiguracion = document.getElementById('formConfiguracion');
const formMateria = document.getElementById('formMateria');
const adminFechaInicio = document.getElementById('adminFechaInicio');
const adminFechaFin = document.getElementById('adminFechaFin');
const adminInscripcionActiva = document.getElementById('adminInscripcionActiva');
const adminCertificadosActivos = document.getElementById('adminCertificadosActivos');
const adminCodigoMateria = document.getElementById('adminCodigoMateria');
const adminNombreMateria = document.getElementById('adminNombreMateria');
const adminRequisitosMateria = document.getElementById('adminRequisitosMateria');
const adminCodigoParalelo = document.getElementById('adminCodigoParalelo');
const adminHorarioParalelo = document.getElementById('adminHorarioParalelo');
const adminCupoParalelo = document.getElementById('adminCupoParalelo');
const listaMateriasAdmin = document.getElementById('listaMateriasAdmin');
const formUsuario = document.getElementById('formUsuario');
const adminUsuarioRu = document.getElementById('adminUsuarioRu');
const adminUsuarioNombre = document.getElementById('adminUsuarioNombre');
const adminUsuarioContrasena = document.getElementById('adminUsuarioContrasena');
const adminUsuarioCarrera = document.getElementById('adminUsuarioCarrera');
const adminUsuarioPlan = document.getElementById('adminUsuarioPlan');
const adminUsuarioMaterias = document.getElementById('adminUsuarioMaterias');
const adminUsuarioDeuda = document.getElementById('adminUsuarioDeuda');
const adminUsuarioProcesos = document.getElementById('adminUsuarioProcesos');
const listaUsuariosAdmin = document.getElementById('listaUsuariosAdmin');

function guardarSesion(token, usuario) {
  estadoApp.token = token;
  estadoApp.usuario = usuario;
  localStorage.setItem('tokenTramites', token);
  localStorage.setItem('usuarioTramites', JSON.stringify(usuario));
}

function limpiarSesion() {
  estadoApp.token = '';
  estadoApp.usuario = null;
  localStorage.removeItem('tokenTramites');
  localStorage.removeItem('usuarioTramites');
}

// INTRUSIÓN LIMPIA INTERCEPTANDO EL FETCH ASÍNCRONO ORIGINAL
async function solicitudJson(url, opciones = {}) {
  // LLAMADA DIRECTA AL SERVIDOR SIMULADO
  const respuestaSimulada = emularServidorNode(url, opciones);
  
  if (!respuestaSimulada.ok) {
    throw new Error(respuestaSimulada.mensaje || respuestaSimulada.motivo || 'Error en la solicitud');
  }
  return respuestaSimulada;
}

function alternarPaneles(mostrarPrincipal) {
  panelLogin.classList.toggle('oculto', mostrarPrincipal);
  panelPrincipal.classList.toggle('oculto', !mostrarPrincipal);
}

function activarSeccion(nombreSeccion) {
  estadoApp.seccionActiva = nombreSeccion;
  seccionInscripcion.classList.toggle('oculto', nombreSeccion !== 'inscripcion');
  seccionCertificaciones.classList.toggle('oculto', nombreSeccion !== 'certificaciones');
  seccionAdministracion.classList.toggle('oculto', nombreSeccion !== 'administracion');
}

function formatearFecha(fechaISO) {
  if (!fechaISO) return 'Sin definir';
  return new Date(fechaISO).toLocaleDateString('es-BO');
}

function formatoHorario(paralelo) {
  return `${paralelo.codigo} · ${paralelo.horario} · ${paralelo.inscritos}/${paralelo.cupoMaximo}`;
}

function renderizarMaterias() {
  if (!estadoApp.catalogo.length) {
    selectMateria.innerHTML = '<option value="">Sin materias</option>';
    selectParalelo.innerHTML = '<option value="">Sin paralelos</option>';
    infoInscripcion.textContent = 'Aun no existen materias cargadas en el catalogo.';
    return;
  }
  selectMateria.innerHTML = estadoApp.catalogo
    .map((materia) => `<option value="${materia.codigo}">${materia.codigo} - ${materia.nombre}</option>`)
    .join('');
  renderizarParalelos();
  mostrarDetalleMateria();
}

function renderizarParalelos() {
  const materia = estadoApp.catalogo.find((item) => item.codigo === selectMateria.value) || estadoApp.catalogo[0];
  if (!materia) return;
  selectParalelo.innerHTML = materia.paralelos
    .map((paralelo) => `<option value="${paralelo.codigo}">${formatoHorario(paralelo)}</option>`)
    .join('');
}

function mostrarDetalleMateria() {
  const materia = estadoApp.catalogo.find((item) => item.codigo === selectMateria.value);
  const paralelo = materia?.paralelos.find((item) => item.codigo === selectParalelo.value);
  if (!materia || !paralelo) {
    infoInscripcion.textContent = 'Selecciona una materia para ver sus datos.';
    return;
  }
  infoInscripcion.innerHTML = `
    <strong>${materia.codigo} - ${materia.nombre}</strong><br />
    Requisitos: ${materia.requisitos.length ? materia.requisitos.join(', ') : 'Sin requisitos'}<br />
    Paralelo: ${paralelo.codigo} · Horario: ${paralelo.horario}<br />
    Cupo disponible: ${paralelo.cupoMaximo - paralelo.inscritos}
  `;
}

function crearTarjetaDocumento(titulo, lineas, acciones = '') {
  return `
    <div class="item-documento">
      <strong>${titulo}</strong>
      <p>${lineas.join('<br />')}</p>
      ${acciones ? `<div class="acciones-documento">${acciones}</div>` : ''}
    </div>
  `;
}

// EMULADOR LOCAL DE DESCARGA DE PDF SIN SOLICITUD DE RED EXTERNA
async function descargarArchivo(endpoint, nombreArchivo) {
  let contenidoTexto = "UNIVERSIDAD MAYOR DE SAN ANDRÉS\nDOCUMENTO OFICIAL DIGITAL\n\nID Verificación: " + endpoint.split('/')[3];
  
  const blob = new Blob([contenidoTexto], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo.replace('.pdf', '.txt'); // Se baja como bitácora verificable de texto
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

function renderizarInscripciones(inscripciones) {
  if (!inscripciones || !inscripciones.length) {
    listaInscripciones.innerHTML = '<div class="item-documento"><strong>Sin registros</strong><p>Aun no existen inscripciones almacenadas.</p></div>';
    return;
  }
  listaInscripciones.innerHTML = inscripciones
    .slice()
    .reverse()
    .map((inscripcion) => crearTarjetaDocumento(
      `${inscripcion.codigoMateria} - ${inscripcion.nombreMateria}`,
      [
        `Paralelo ${inscripcion.codigoParalelo}`,
        inscripcion.horario,
        `Estado: ${inscripcion.estado}`,
        new Date(inscripcion.fecha).toLocaleString('es-BO')
      ],
      `<button class="boton secundario js-descargar-archivo" type="button" data-endpoint="/api/inscripciones/${inscripcion.id}/pdf" data-nombre="boleta_${inscripcion.id}.pdf">Descargar boleta</button>`
    ))
    .join('');
}

function renderizarCertificados(certificados) {
  if (!certificados || !certificados.length) {
    listaCertificados.innerHTML = '<div class="item-documento"><strong>Sin registros</strong><p>Aun no existen certificados almacenados.</p></div>';
    return;
  }
  listaCertificados.innerHTML = certificados
    .slice()
    .reverse()
    .map((certificado) => {
      const acciones = certificado.pdfGenerado
        ? `<button class="boton exito js-descargar-archivo" type="button" data-endpoint="/api/certificados/${certificado.id}/pdf" data-nombre="certificado_${certificado.id}.pdf">Descargar certificado</button>`
        : '<span class="boton secundario" style="cursor:default">En espera de pago</span>';
      return crearTarjetaDocumento(
        certificado.tipoCertificado,
        [
          certificado.motivo || 'Sin observacion',
          `Estado: ${certificado.estado}`,
          new Date(certificado.fechaSolicitud).toLocaleString('es-BO')
        ],
        acciones
      );
    })
    .join('');
}

function renderizarCronograma() {
  if (!estadoApp.configuracion) return;
  panelCronograma.innerHTML = `
    <strong>Cronograma de inscripcion</strong><br />
    Fecha de inicio: ${formatearFecha(estadoApp.configuracion.fechaInicioInscripcion)}<br />
    Fecha de fin: ${formatearFecha(estadoApp.configuracion.fechaFinInscripcion)}<br />
    Estado actual: ${estadoApp.configuracion.inscripcionActiva ? 'Habilitado' : 'No se habilita la inscripcion'}
  `;
}

function renderizarCatalogoAdmin() {
  if (!listaMateriasAdmin) return;
  if (!estadoApp.catalogo.length) {
    listaMateriasAdmin.innerHTML = '<div class="item-documento"><strong>Sin materias</strong><p>No hay materias registradas.</p></div>';
    return;
  }
  listaMateriasAdmin.innerHTML = estadoApp.catalogo.map((materia) => {
    const paralelos = materia.paralelos.map((paralelo) => `${paralelo.codigo} · ${paralelo.horario} · ${paralelo.inscritos}/${paralelo.cupoMaximo}`).join('<br />');
    return `
      <div class="item-documento">
        <strong>${materia.codigo} - ${materia.nombre}</strong>
        <p>Requisitos: ${materia.requisitos.length ? materia.requisitos.join(', ') : 'Sin requisitos'}</p>
        <p>Paralelos:<br />${paralelos || 'Sin paralelos'}</p>
      </div>
    `;
  }).join('');
}

function renderizarUsuariosAdmin(usuarios) {
  if (!listaUsuariosAdmin) return;
  if (!usuarios || !usuarios.length) {
    listaUsuariosAdmin.innerHTML = '<div class="item-documento"><strong>Sin usuarios</strong><p>No hay estudiantes registrados.</p></div>';
    return;
  }
  listaUsuariosAdmin.innerHTML = usuarios.map((usuario) => `
    <div class="item-documento">
      <strong>${usuario.ru} - ${usuario.nombre}</strong>
      <p>Carrera: ${usuario.carrera}</p>
      <p>Plan: ${usuario.plan}</p>
      <p>Materias aprobadas: ${usuario.materiasAprobadas?.length ? usuario.materiasAprobadas.join(', ') : 'Ninguna'}</p>
    </div>
  `).join('');
}

async function cargarTablero() {
  const datos = await solicitudJson('/api/catalogo');
  estadoApp.catalogo = datos.catalogo;
  estadoApp.configuracion = datos.configuracion;
  nombreUsuario.textContent = datos.usuario.nombre;
  detalleUsuario.textContent = `RU ${datos.usuario.ru} · ${datos.usuario.carrera} · Plan ${datos.usuario.plan} · ${datos.usuario.rol === 'admin' ? 'Administrador' : 'Estudiante'}`;
  estadoInscripcion.textContent = datos.configuracion.inscripcionActiva ? 'Habilitado' : 'Cerrado';
  estadoCertificado.textContent = datos.configuracion.certificadosActivos ? 'Operativo' : 'Suspendido';
  botonIrAdministracion.classList.toggle('oculto', datos.usuario.rol !== 'admin');
  renderizarCronograma();
  renderizarMaterias();
  
  const inscripciones = await solicitudJson('/api/inscripciones');
  const certificados = await solicitudJson('/api/certificados');
  renderizarInscripciones(inscripciones.datos);
  renderizarCertificados(certificados.datos);
  renderizarCatalogoAdmin();
  if (datos.usuario.rol === 'admin') {
    const usuariosAdmin = await solicitudJson('/api/admin/usuarios');
    renderizarUsuariosAdmin(usuariosAdmin.usuarios);
  }
  alternarPaneles(true);
  activarSeccion(estadoApp.seccionActiva);
}

async function iniciarSesionDesdeStorage() {
  if (!estadoApp.token) return;
  try {
    await cargarTablero();
  } catch {
    limpiarSesion();
    alternarPaneles(false);
  }
}

formLogin.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  mensajeLogin.textContent = 'Validando credenciales...';
  try {
    const datos = await solicitudJson('/api/login', {
      method: 'POST',
      body: JSON.stringify({
        ru: document.getElementById('campoRu').value,
        contrasena: document.getElementById('campoContrasena').value
      })
    });
    guardarSesion(datos.token, datos.usuario);
    mensajeLogin.textContent = 'Acceso concedido.';
    await cargarTablero();
  } catch (error) {
    mensajeLogin.textContent = error.message;
  }
});

cerrarSesion.addEventListener('click', () => {
  limpiarSesion();
  alternarPaneles(false);
  mensajeLogin.textContent = 'Sesion cerrada.';
  estadoApp.catalogo = [];
  estadoApp.configuracion = null;
  estadoApp.seccionActiva = 'inscripcion';
});

botonIrInscripcion.addEventListener('click', () => activarSeccion('inscripcion'));
botonIrCertificaciones.addEventListener('click', () => activarSeccion('certificaciones'));
botonIrAdministracion.addEventListener('click', () => activarSeccion('administracion'));

selectMateria.addEventListener('change', () => {
  renderizarParalelos();
  mostrarDetalleMateria();
  botonConfirmarInscripcion.disabled = true;
  estadoApp.inscripcionSeleccionada = null;
});

selectParalelo.addEventListener('change', () => {
  mostrarDetalleMateria();
  botonConfirmarInscripcion.disabled = true;
  estadoApp.inscripcionSeleccionada = null;
});

botonValidarInscripcion.addEventListener('click', async () => {
  try {
    const resultado = await solicitudJson('/api/inscripciones/validar', {
      method: 'POST',
      body: JSON.stringify({
        codigoMateria: selectMateria.value,
        codigoParalelo: selectParalelo.value
      })
    });
    estadoApp.inscripcionSeleccionada = { codigoMateria: selectMateria.value, codigoParalelo: selectParalelo.value };
    botonConfirmarInscripcion.disabled = false;
    infoInscripcion.textContent = `Validacion correcta: ${resultado.materia.nombre} en paralelo ${resultado.paralelo.codigo}.`;
  } catch (error) {
    botonConfirmarInscripcion.disabled = true;
    estadoApp.inscripcionSeleccionada = null;
    infoInscripcion.textContent = error.message;
  }
});

botonConfirmarInscripcion.addEventListener('click', async () => {
  if (!estadoApp.inscripcionSeleccionada) return;
  try {
    const resultado = await solicitudJson('/api/inscripciones', {
      method: 'POST',
      body: JSON.stringify(estadoApp.inscripcionSeleccionada)
    });
    infoInscripcion.textContent = `${resultado.mensaje}. Boleta disponible para descarga.`;
    botonConfirmarInscripcion.disabled = true;
    estadoApp.inscripcionSeleccionada = null;
    await cargarTablero();
  } catch (error) {
    infoInscripcion.textContent = error.message;
  }
});

botonValidarCertificado.addEventListener('click', async () => {
  try {
    const resultado = await solicitudJson('/api/certificados/validar', {
      method: 'POST',
      body: JSON.stringify({
        tipoCertificado: selectTipoCertificado.value
      })
    });
    estadoApp.certificadoActivo = {
      tipoCertificado: selectTipoCertificado.value,
      motivo: campoMotivo.value,
      metodoPago: selectMetodoPago.value
    };
    botonCrearCertificado.disabled = false;
    infoCertificado.textContent = 'Requisitos verificados. Puedes enviar la solicitud.';
  } catch (error) {
    botonCrearCertificado.disabled = true;
    estadoApp.certificadoActivo = null;
    infoCertificado.textContent = error.message;
  }
});

botonCrearCertificado.addEventListener('click', async () => {
  if (!estadoApp.certificadoActivo) return;
  try {
    const resultado = await solicitudJson('/api/certificados', {
      method: 'POST',
      body: JSON.stringify(estadoApp.certificadoActivo)
    });
    infoCertificado.textContent = `${resultado.mensaje}. Procede el pago para generar el documento.`;
    botonPagarCertificado.disabled = false;
    botonCrearCertificado.disabled = true;
    botonValidarCertificado.disabled = true;
    estadoApp.certificadoActivo = { ...estadoApp.certificadoActivo, id: resultado.solicitud.id };
    await cargarTablero();
    estadoApp.certificadoActivo = { ...estadoApp.certificadoActivo, id: resultado.solicitud.id };
  } catch (error) {
    infoCertificado.textContent = error.message;
  }
});

botonPagarCertificado.addEventListener('click', async () => {
  if (!estadoApp.certificadoActivo?.id) return;
  try {
    const resultado = await solicitudJson(`/api/certificados/${estadoApp.certificadoActivo.id}/pago`, {
      method: 'POST',
      body: JSON.stringify({ cancelar: false, metodoPago: selectMetodoPago.value })
    });
    infoCertificado.textContent = `${resultado.mensaje}. PDF listo para descarga.`;
    botonPagarCertificado.disabled = true;
    botonValidarCertificado.disabled = false;
    estadoApp.certificadoActivo = null;
    await cargarTablero();
  } catch (error) {
    infoCertificado.textContent = error.message;
  }
});

document.addEventListener('click', async (evento) => {
  const objetivo = evento.target.closest('.js-descargar-archivo');
  if (!objetivo) return;
  try {
    await descargarArchivo(objetivo.dataset.endpoint, objetivo.dataset.nombre);
  } catch (error) {
    infoCertificado.textContent = error.message;
  }
});

formConfiguracion.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  try {
    await solicitudJson('/api/admin/configuracion', {
      method: 'POST',
      body: JSON.stringify({
        fechaInicioInscripcion: adminFechaInicio.value,
        fechaFinInscripcion: adminFechaFin.value,
        inscripcionActiva: adminInscripcionActiva.checked,
        certificadosActivos: adminCertificadosActivos.checked
      })
    });
    mensajeLogin.textContent = 'Cronograma actualizado.';
    await cargarTablero();
  } catch (error) {
    infoInscripcion.textContent = error.message;
  }
});

formMateria.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  try {
    await solicitudJson('/api/admin/materias', {
      method: 'POST',
      body: JSON.stringify({
        codigoMateria: adminCodigoMateria.value,
        nombreMateria: adminNombreMateria.value,
        requisitos: adminRequisitosMateria.value,
        codigoParalelo: adminCodigoParalelo.value,
        horario: adminHorarioParalelo.value,
        cupoMaximo: adminCupoParalelo.value
      })
    });
    formMateria.reset();
    adminCupoParalelo.value = '30';
    mensajeLogin.textContent = 'Materia actualizada.';
    await cargarTablero();
  } catch (error) {
    infoInscripcion.textContent = error.message;
  }
});

formUsuario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  try {
    await solicitudJson('/api/admin/usuarios', {
      method: 'POST',
      body: JSON.stringify({
        ru: adminUsuarioRu.value,
        nombre: adminUsuarioNombre.value,
        contrasena: adminUsuarioContrasena.value,
        carrera: adminUsuarioCarrera.value,
        plan: adminUsuarioPlan.value,
        materiasAprobadas: adminUsuarioMaterias.value,
        deudaActiva: adminUsuarioDeuda.checked,
        procesosPendientes: adminUsuarioProcesos.checked
      })
    });
    formUsuario.reset();
    mensajeLogin.textContent = 'Estudiante creado.';
    await cargarTablero();
  } catch (error) {
    infoInscripcion.textContent = error.message;
  }
});

async function cargarDatosAdministracion() {
  if (!estadoApp.usuario || estadoApp.usuario.rol !== 'admin') return;
  const datosAdmin = await solicitudJson('/api/admin/resumen');
  adminFechaInicio.value = datosAdmin.configuracion.fechaInicioInscripcion;
  adminFechaFin.value = datosAdmin.configuracion.fechaFinInscripcion;
  adminInscripcionActiva.checked = Boolean(datosAdmin.configuracion.inscripcionActiva);
  adminCertificadosActivos.checked = Boolean(datosAdmin.configuracion.certificadosActivos);
}

iniciarSesionDesdeStorage();

const cargarTableroOriginal = cargarTablero;
cargarTablero = async function cargarTableroConAdmin() {
  await cargarTableroOriginal();
  await cargarDatosAdministracion();
};