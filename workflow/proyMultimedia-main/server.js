const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const raiz = __dirname;
const carpetaDatos = path.join(raiz, 'data');
const carpetaPublica = path.join(raiz, 'public');

const rutasDatos = {
  usuarios: path.join(carpetaDatos, 'usuarios.json'),
  catalogo: path.join(carpetaDatos, 'catalogo.json'),
  configuracion: path.join(carpetaDatos, 'configuracion.json'),
  inscripciones: path.join(carpetaDatos, 'inscripciones.json'),
  certificados: path.join(carpetaDatos, 'certificados.json')
};

const sesiones = new Map();

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

async function asegurarArchivo(ruta, contenidoInicial) {
  try {
    await fs.access(ruta);
  } catch {
    await fs.writeFile(ruta, JSON.stringify(contenidoInicial, null, 2), 'utf8');
  }
}

async function asegurarEntorno() {
  await fs.mkdir(carpetaDatos, { recursive: true });
  await fs.mkdir(carpetaPublica, { recursive: true });
  await asegurarArchivo(rutasDatos.usuarios, datosIniciales.usuarios);
  await asegurarArchivo(rutasDatos.catalogo, datosIniciales.catalogo);
  await asegurarArchivo(rutasDatos.configuracion, datosIniciales.configuracion);
  await asegurarArchivo(rutasDatos.inscripciones, datosIniciales.inscripciones);
  await asegurarArchivo(rutasDatos.certificados, datosIniciales.certificados);
}

async function leerJson(ruta, valorDefecto) {
  try {
    const contenido = await fs.readFile(ruta, 'utf8');
    return JSON.parse(contenido);
  } catch {
    return valorDefecto;
  }
}

async function guardarJson(ruta, dato) {
  await fs.writeFile(ruta, JSON.stringify(dato, null, 2), 'utf8');
}

function enviarJson(respuesta, codigo, datos) {
  respuesta.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8' });
  respuesta.end(JSON.stringify(datos));
}

function enviarTexto(respuesta, codigo, texto, tipo = 'text/plain; charset=utf-8') {
  respuesta.writeHead(codigo, { 'Content-Type': tipo });
  respuesta.end(texto);
}

async function leerCuerpo(solicitud) {
  const partes = [];
  for await (const parte of solicitud) {
    partes.push(parte);
  }
  const texto = Buffer.concat(partes).toString('utf8');
  if (!texto) return {};
  return JSON.parse(texto);
}

function crearId(prefijo) {
  return `${prefijo}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function obtenerToken(solicitud) {
  const cabecera = solicitud.headers.authorization || '';
  const partes = cabecera.split(' ');
  if (partes.length === 2 && partes[0] === 'Bearer') return partes[1];
  return null;
}

function esAdmin(usuario) {
  return usuario && usuario.rol === 'admin';
}

function normalizarTexto(valor) {
  return String(valor || '').trim();
}

function dividirLista(valor) {
  return String(valor || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizarUsuarioEstudiante(datos) {
  return {
    ru: normalizarTexto(datos.ru),
    nombre: normalizarTexto(datos.nombre),
    contrasena: normalizarTexto(datos.contrasena),
    carrera: normalizarTexto(datos.carrera),
    plan: normalizarTexto(datos.plan),
    materiasAprobadas: dividirLista(datos.materiasAprobadas),
    deudaActiva: Boolean(datos.deudaActiva),
    procesosPendientes: Boolean(datos.procesosPendientes),
    rol: 'estudiante'
  };
}

async function obtenerUsuarioAutenticado(solicitud) {
  const token = obtenerToken(solicitud);
  if (!token) return null;
  const ru = sesiones.get(token);
  if (!ru) return null;
  const usuarios = await leerJson(rutasDatos.usuarios, datosIniciales.usuarios);
  return usuarios.find((usuario) => usuario.ru === ru) || null;
}

function fechaEnRango(fecha, inicio, fin) {
  const valor = new Date(fecha).getTime();
  return valor >= new Date(inicio).getTime() && valor <= new Date(fin).getTime();
}

function crearLinea(valor) {
  return String(valor)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function crearPdfSimple(titulo, lineas) {
  const contenido = [titulo, '', ...lineas].map(crearLinea);
  const bloqueTexto = [`BT`, `/F1 16 Tf`, `50 780 Td`, `(${contenido[0]}) Tj`, `0 -28 Td`, `/F1 11 Tf`]
    .concat(contenido.slice(1).flatMap((linea) => [`(${linea}) Tj`, '0 -18 Td']))
    .concat(['ET'])
    .join('\n');

  const objetos = [];
  objetos.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  objetos.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');
  objetos.push('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj');
  objetos.push('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');
  objetos.push(`5 0 obj\n<< /Length ${Buffer.byteLength(bloqueTexto)} >>\nstream\n${bloqueTexto}\nendstream\nendobj`);

  const partes = ['%PDF-1.4'];
  const offsets = [0];
  let longitud = partes[0].length + 1;
  for (const objeto of objetos) {
    offsets.push(longitud);
    partes.push(objeto);
    longitud += Buffer.byteLength(objeto) + 1;
  }

  const inicioXref = longitud;
  partes.push('xref');
  partes.push('0 6');
  partes.push('0000000000 65535 f ');
  for (let indice = 1; indice <= 5; indice += 1) {
    partes.push(String(offsets[indice]).padStart(10, '0') + ' 00000 n ');
  }
  partes.push('trailer');
  partes.push('<< /Size 6 /Root 1 0 R >>');
  partes.push('startxref');
  partes.push(String(inicioXref));
  partes.push('%%EOF');
  return Buffer.from(partes.join('\n'), 'utf8');
}

function obtenerMateria(catalogo, codigoMateria, codigoParalelo) {
  const materia = catalogo.find((item) => item.codigo === codigoMateria);
  if (!materia) return null;
  const paralelo = materia.paralelos.find((item) => item.codigo === codigoParalelo);
  if (!paralelo) return null;
  return { materia, paralelo };
}

function validarInscripcion(usuario, configuracion, catalogo, codigoMateria, codigoParalelo) {
  if (!configuracion.inscripcionActiva) {
    return { ok: false, motivo: 'No se habilita la inscripcion' };
  }
  if (!fechaEnRango(new Date(), configuracion.fechaInicioInscripcion, configuracion.fechaFinInscripcion)) {
    return { ok: false, motivo: 'No se habilita la inscripcion' };
  }
  const seleccion = obtenerMateria(catalogo, codigoMateria, codigoParalelo);
  if (!seleccion) {
    return { ok: false, motivo: 'Materia o paralelo no encontrado' };
  }
  const { materia, paralelo } = seleccion;
  const cumple = materia.requisitos.every((requisito) => usuario.materiasAprobadas.includes(requisito));
  if (!cumple) {
    return { ok: false, motivo: 'No cumple requisitos' };
  }
  if (paralelo.inscritos >= paralelo.cupoMaximo) {
    return { ok: false, motivo: 'Cupo lleno' };
  }
  return { ok: true, materia, paralelo };
}

function validarCertificado(usuario, tipoCertificado) {
  if (!tipoCertificado) {
    return { ok: false, motivo: 'Seleccione un tipo de certificado' };
  }
  if (!usuario) {
    return { ok: false, motivo: 'Usuario no encontrado' };
  }
  if (usuario.deudaActiva || usuario.procesosPendientes) {
    return { ok: false, motivo: 'El estudiante tiene deudas o procesos pendientes' };
  }
  return { ok: true };
}

async function manejarLogin(solicitud, respuesta) {
  const cuerpo = await leerCuerpo(solicitud);
  const ru = String(cuerpo.ru || '').trim();
  const contrasena = String(cuerpo.contrasena || '').trim();
  const usuarios = await leerJson(rutasDatos.usuarios, datosIniciales.usuarios);
  const usuario = usuarios.find((item) => item.ru === ru && item.contrasena === contrasena);
  if (!usuario) {
    return enviarJson(respuesta, 401, { mensaje: 'Credenciales incorrectas' });
  }
  const token = crypto.randomBytes(24).toString('hex');
  sesiones.set(token, usuario.ru);
  return enviarJson(respuesta, 200, {
    mensaje: 'Acceso concedido',
    token,
    usuario: {
      ru: usuario.ru,
      nombre: usuario.nombre,
      rol: usuario.rol || 'estudiante',
      carrera: usuario.carrera,
      plan: usuario.plan
    }
  });
}

async function manejarCatalogo(solicitud, respuesta) {
  const usuario = await obtenerUsuarioAutenticado(solicitud);
  if (!usuario) return enviarJson(respuesta, 401, { mensaje: 'No autorizado' });
  const configuracion = await leerJson(rutasDatos.configuracion, datosIniciales.configuracion);
  const catalogo = await leerJson(rutasDatos.catalogo, datosIniciales.catalogo);
  return enviarJson(respuesta, 200, { configuracion, catalogo, usuario });
}

async function manejarAdmin(solicitud, respuesta, ruta) {
  const usuario = await obtenerUsuarioAutenticado(solicitud);
  if (!esAdmin(usuario)) {
    return enviarJson(respuesta, 403, { mensaje: 'Acceso de administrador requerido' });
  }

  const configuracion = await leerJson(rutasDatos.configuracion, datosIniciales.configuracion);
  const catalogo = await leerJson(rutasDatos.catalogo, datosIniciales.catalogo);

  if (ruta === '/api/admin/resumen' && solicitud.method === 'GET') {
    return enviarJson(respuesta, 200, { configuracion, catalogo, usuario });
  }

  if (ruta === '/api/admin/configuracion' && solicitud.method === 'POST') {
    const cuerpo = await leerCuerpo(solicitud);
    const nuevaConfiguracion = {
      inscripcionActiva: Boolean(cuerpo.inscripcionActiva),
      certificadosActivos: Boolean(cuerpo.certificadosActivos),
      fechaInicioInscripcion: normalizarTexto(cuerpo.fechaInicioInscripcion),
      fechaFinInscripcion: normalizarTexto(cuerpo.fechaFinInscripcion)
    };
    await guardarJson(rutasDatos.configuracion, nuevaConfiguracion);
    return enviarJson(respuesta, 200, {
      mensaje: 'Configuracion actualizada',
      configuracion: nuevaConfiguracion
    });
  }

  if (ruta === '/api/admin/materias' && solicitud.method === 'POST') {
    const cuerpo = await leerCuerpo(solicitud);
    const codigoMateria = normalizarTexto(cuerpo.codigoMateria);
    const nombreMateria = normalizarTexto(cuerpo.nombreMateria);
    const requisitos = dividirLista(cuerpo.requisitos);
    const codigoParalelo = normalizarTexto(cuerpo.codigoParalelo);
    const horario = normalizarTexto(cuerpo.horario);
    const cupoMaximo = Number(cuerpo.cupoMaximo || 0);

    if (!codigoMateria || !nombreMateria) {
      return enviarJson(respuesta, 400, { mensaje: 'El codigo y el nombre de la materia son obligatorios' });
    }

    let materia = catalogo.find((item) => item.codigo === codigoMateria);
    if (!materia) {
      materia = { codigo: codigoMateria, nombre: nombreMateria, requisitos, paralelos: [] };
      catalogo.push(materia);
    } else {
      materia.nombre = nombreMateria;
      materia.requisitos = requisitos;
    }

    if (codigoParalelo) {
      const paraleloExistente = materia.paralelos.find((item) => item.codigo === codigoParalelo);
      if (paraleloExistente) {
        paraleloExistente.horario = horario || paraleloExistente.horario;
        paraleloExistente.cupoMaximo = cupoMaximo > 0 ? cupoMaximo : paraleloExistente.cupoMaximo;
      } else {
        materia.paralelos.push({
          codigo: codigoParalelo,
          horario: horario || 'Sin horario',
          cupoMaximo: cupoMaximo > 0 ? cupoMaximo : 30,
          inscritos: 0
        });
      }
    }

    await guardarJson(rutasDatos.catalogo, catalogo);
    return enviarJson(respuesta, 200, {
      mensaje: 'Materia actualizada',
      catalogo
    });
  }

  if (ruta === '/api/admin/usuarios' && solicitud.method === 'GET') {
    const usuarios = await leerJson(rutasDatos.usuarios, datosIniciales.usuarios);
    return enviarJson(respuesta, 200, {
      usuarios: usuarios.filter((item) => item.rol !== 'admin')
    });
  }

  if (ruta === '/api/admin/usuarios' && solicitud.method === 'POST') {
    const cuerpo = await leerCuerpo(solicitud);
    const nuevoUsuario = normalizarUsuarioEstudiante(cuerpo);

    if (!nuevoUsuario.ru || !nuevoUsuario.nombre || !nuevoUsuario.contrasena) {
      return enviarJson(respuesta, 400, { mensaje: 'RU, nombre y contraseña son obligatorios' });
    }

    const usuarios = await leerJson(rutasDatos.usuarios, datosIniciales.usuarios);
    const existe = usuarios.some((item) => item.ru === nuevoUsuario.ru);
    if (existe) {
      return enviarJson(respuesta, 409, { mensaje: 'Ya existe un usuario con ese RU' });
    }

    usuarios.push(nuevoUsuario);
    await guardarJson(rutasDatos.usuarios, usuarios);
    return enviarJson(respuesta, 201, {
      mensaje: 'Usuario estudiante creado',
      usuario: nuevoUsuario
    });
  }

  return enviarJson(respuesta, 405, { mensaje: 'Metodo no permitido' });
}

async function manejarInscripciones(solicitud, respuesta, ruta) {
  const usuario = await obtenerUsuarioAutenticado(solicitud);
  if (!usuario) return enviarJson(respuesta, 401, { mensaje: 'No autorizado' });
  const configuracion = await leerJson(rutasDatos.configuracion, datosIniciales.configuracion);
  const catalogo = await leerJson(rutasDatos.catalogo, datosIniciales.catalogo);
  const inscripciones = await leerJson(rutasDatos.inscripciones, datosIniciales.inscripciones);

  if (ruta.startsWith('/api/inscripciones/') && ruta.endsWith('/pdf') && solicitud.method === 'GET') {
    const id = ruta.split('/')[3];
    const inscripcion = inscripciones.find((item) => item.id === id && item.ru === usuario.ru);
    if (!inscripcion) return enviarTexto(respuesta, 404, 'Inscripcion no encontrada');
    const pdf = crearPdfSimple('BOLETA DE INSCRIPCION', [
      `Estudiante: ${inscripcion.nombreEstudiante}`,
      `RU: ${inscripcion.ru}`,
      `Materia: ${inscripcion.codigoMateria} - ${inscripcion.nombreMateria}`,
      `Paralelo: ${inscripcion.codigoParalelo}`,
      `Horario: ${inscripcion.horario}`,
      `Estado: ${inscripcion.estado}`,
      `Fecha: ${new Date(inscripcion.fecha).toLocaleString('es-BO')}`
    ]);
    respuesta.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=boleta_${inscripcion.id}.pdf`
    });
    return respuesta.end(pdf);
  }

  if (solicitud.method === 'GET') {
    return enviarJson(respuesta, 200, inscripciones.filter((inscripcion) => inscripcion.ru === usuario.ru));
  }

  if (ruta === '/api/inscripciones/validar' && solicitud.method === 'POST') {
    const cuerpo = await leerCuerpo(solicitud);
    const resultado = validarInscripcion(usuario, configuracion, catalogo, cuerpo.codigoMateria, cuerpo.codigoParalelo);
    return enviarJson(respuesta, resultado.ok ? 200 : 409, resultado);
  }

  if (ruta === '/api/inscripciones' && solicitud.method === 'POST') {
    const cuerpo = await leerCuerpo(solicitud);
    const resultado = validarInscripcion(usuario, configuracion, catalogo, cuerpo.codigoMateria, cuerpo.codigoParalelo);
    if (!resultado.ok) {
      return enviarJson(respuesta, 409, resultado);
    }
    const seleccion = obtenerMateria(catalogo, cuerpo.codigoMateria, cuerpo.codigoParalelo);
    const nuevaInscripcion = {
      id: crearId('INS'),
      ru: usuario.ru,
      nombreEstudiante: usuario.nombre,
      codigoMateria: seleccion.materia.codigo,
      nombreMateria: seleccion.materia.nombre,
      codigoParalelo: seleccion.paralelo.codigo,
      horario: seleccion.paralelo.horario,
      estado: 'confirmada',
      fecha: new Date().toISOString(),
      tipo: 'inscripcion'
    };
    seleccion.paralelo.inscritos += 1;
    inscripciones.push(nuevaInscripcion);
    await guardarJson(rutasDatos.catalogo, catalogo);
    await guardarJson(rutasDatos.inscripciones, inscripciones);
    return enviarJson(respuesta, 201, {
      mensaje: 'Inscripcion registrada',
      inscripcion: nuevaInscripcion,
      boletaPdf: `/api/inscripciones/${nuevaInscripcion.id}/pdf`
    });
  }

  return enviarJson(respuesta, 405, { mensaje: 'Metodo no permitido' });
}

async function manejarCertificados(solicitud, respuesta, ruta) {
  const usuario = await obtenerUsuarioAutenticado(solicitud);
  if (!usuario) return enviarJson(respuesta, 401, { mensaje: 'No autorizado' });
  const certificados = await leerJson(rutasDatos.certificados, datosIniciales.certificados);

  if (ruta.startsWith('/api/certificados/') && ruta.endsWith('/pdf') && solicitud.method === 'GET') {
    const id = ruta.split('/')[3];
    const solicitudCertificado = certificados.find((item) => item.id === id && item.ru === usuario.ru);
    if (!solicitudCertificado || !solicitudCertificado.pdfGenerado) {
      return enviarTexto(respuesta, 404, 'Certificado no disponible');
    }
    const pdf = crearPdfSimple('CERTIFICADO ELECTRONICO', [
      `Estudiante: ${solicitudCertificado.nombreEstudiante}`,
      `RU: ${solicitudCertificado.ru}`,
      `Tipo: ${solicitudCertificado.tipoCertificado}`,
      `Motivo: ${solicitudCertificado.motivo || 'Sin motivo'}`,
      `Estado: ${solicitudCertificado.estado}`,
      `Fecha de emision: ${new Date(solicitudCertificado.fechaEmision).toLocaleString('es-BO')}`
    ]);
    respuesta.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=certificado_${solicitudCertificado.id}.pdf`
    });
    return respuesta.end(pdf);
  }

  if (solicitud.method === 'GET') {
    return enviarJson(respuesta, 200, certificados.filter((certificado) => certificado.ru === usuario.ru));
  }

  if (ruta === '/api/certificados/validar' && solicitud.method === 'POST') {
    const cuerpo = await leerCuerpo(solicitud);
    return enviarJson(respuesta, 200, validarCertificado(usuario, cuerpo.tipoCertificado));
  }

  if (ruta === '/api/certificados' && solicitud.method === 'POST') {
    const cuerpo = await leerCuerpo(solicitud);
    const resultado = validarCertificado(usuario, cuerpo.tipoCertificado);
    if (!resultado.ok) {
      return enviarJson(respuesta, 409, resultado);
    }
    const nuevaSolicitud = {
      id: crearId('CER'),
      ru: usuario.ru,
      nombreEstudiante: usuario.nombre,
      tipoCertificado: cuerpo.tipoCertificado,
      motivo: cuerpo.motivo || '',
      estado: 'pendiente_pago',
      ordenPagoCancelada: false,
      pdfGenerado: false,
      fechaSolicitud: new Date().toISOString(),
      fechaPago: null,
      fechaEmision: null,
      detallePago: cuerpo.metodoPago || 'transferencia'
    };
    certificados.push(nuevaSolicitud);
    await guardarJson(rutasDatos.certificados, certificados);
    return enviarJson(respuesta, 201, {
      mensaje: 'Solicitud registrada',
      solicitud: nuevaSolicitud,
      ordenPago: `/api/certificados/${nuevaSolicitud.id}/pago`
    });
  }

  if (ruta.startsWith('/api/certificados/') && ruta.endsWith('/pago') && solicitud.method === 'POST') {
    const id = ruta.split('/')[3];
    const cuerpo = await leerCuerpo(solicitud);
    const solicitudCertificado = certificados.find((item) => item.id === id && item.ru === usuario.ru);
    if (!solicitudCertificado) return enviarJson(respuesta, 404, { mensaje: 'Solicitud no encontrada' });
    if (cuerpo.cancelar) {
      solicitudCertificado.estado = 'cancelada';
      solicitudCertificado.ordenPagoCancelada = true;
      await guardarJson(rutasDatos.certificados, certificados);
      return enviarJson(respuesta, 200, {
        mensaje: 'No continua la solicitud del tramite',
        solicitud: solicitudCertificado
      });
    }
    solicitudCertificado.estado = 'emitido';
    solicitudCertificado.ordenPagoCancelada = false;
    solicitudCertificado.pdfGenerado = true;
    solicitudCertificado.fechaPago = new Date().toISOString();
    solicitudCertificado.fechaEmision = new Date().toISOString();
    await guardarJson(rutasDatos.certificados, certificados);
    return enviarJson(respuesta, 200, {
      mensaje: 'Pago validado y certificado generado',
      solicitud: solicitudCertificado,
      pdf: `/api/certificados/${solicitudCertificado.id}/pdf`
    });
  }

  return enviarJson(respuesta, 405, { mensaje: 'Metodo no permitido' });
}

async function servirEstatico(ruta, respuesta) {
  const destino = ruta === '/' ? '/index.html' : ruta;
  const archivo = path.join(carpetaPublica, decodeURIComponent(destino));
  if (!archivo.startsWith(carpetaPublica)) {
    return enviarTexto(respuesta, 403, 'Acceso denegado');
  }
  try {
    const contenido = await fs.readFile(archivo);
    const extension = path.extname(archivo).toLowerCase();
    const tipos = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8'
    };
    respuesta.writeHead(200, { 'Content-Type': tipos[extension] || 'application/octet-stream' });
    return respuesta.end(contenido);
  } catch {
    return enviarTexto(respuesta, 404, 'Recurso no encontrado');
  }
}

async function atenderSolicitud(solicitud, respuesta) {
  const url = new URL(solicitud.url, 'http://localhost');
  const ruta = url.pathname;

  if (solicitud.method === 'GET' && ruta === '/api/salud') {
    return enviarJson(respuesta, 200, { estado: 'ok' });
  }

  if (ruta === '/api/login' && solicitud.method === 'POST') return manejarLogin(solicitud, respuesta);
  if (ruta === '/api/catalogo' && solicitud.method === 'GET') return manejarCatalogo(solicitud, respuesta);
  if (ruta === '/api/admin/resumen' || ruta === '/api/admin/configuracion' || ruta === '/api/admin/materias' || ruta === '/api/admin/usuarios') {
    return manejarAdmin(solicitud, respuesta, ruta);
  }
  if (ruta === '/api/inscripciones' || ruta === '/api/inscripciones/validar' || ruta.startsWith('/api/inscripciones/')) {
    return manejarInscripciones(solicitud, respuesta, ruta);
  }
  if (ruta === '/api/certificados' || ruta === '/api/certificados/validar' || ruta.startsWith('/api/certificados/')) {
    return manejarCertificados(solicitud, respuesta, ruta);
  }

  return servirEstatico(ruta, respuesta);
}

async function iniciar() {
  await asegurarEntorno();
  const servidor = http.createServer((solicitud, respuesta) => {
    atenderSolicitud(solicitud, respuesta).catch((error) => {
      console.error(error);
      enviarJson(respuesta, 500, { mensaje: 'Error interno del servidor' });
    });
  });

  const puerto = process.env.PORT || 3000;
  servidor.listen(puerto, () => {
    console.log(`Servidor disponible en http://localhost:${puerto}`);
  });
}

iniciar();