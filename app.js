// UI: lee el DOM, llama a logic.js, pinta resultados, guarda borrador en localStorage.

const STORAGE_KEY = 'control-turno-borrador';
const HISTORIAL_KEY = 'control-turno-historial';
const ANTICIPOS_KEY = 'control-turno-anticipos';
const PERFIL_KEY = 'control-turno-perfil';
const DETALLE_TARJETAS_KEY = 'control-turno-detalle-tarjetas';
const DETALLE_TRANSFERENCIAS_KEY = 'control-turno-detalle-transferencias';
const UMBRAL_FALTANTE = -10;
const APP_VERSION = '27';
const VALE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby765C6gkVLFRmdwLvcQK-fahZ0LhXflUwotDV70SLA2-2stthVKByovOcfaze_Xje2/exec';

const campos = ['fecha', 'turno', 'nombre', 'totalVentas', 'efectivo', 'creditos', 'tarjetas', 'transferencias', 'cheques', 'ventaAceites'];

function num(id) {
  const v = parseFloat(document.getElementById(id).value);
  return isNaN(v) ? 0 : v;
}

function formatoMoneda(valor) {
  const signo = valor < 0 ? '-' : '';
  return `${signo}$${Math.abs(valor).toFixed(2)}`;
}

function recalcular() {
  const datos = {
    totalVentas: num('totalVentas'),
    efectivo: num('efectivo'),
    creditos: num('creditos'),
    tarjetas: num('tarjetas'),
    transferencias: num('transferencias'),
    cheques: num('cheques'),
    ventaAceites: num('ventaAceites'),
  };

  const { totalCobrado, diferenciaCombustible, resultadoFinal } = calcularTurno(datos);

  document.getElementById('resTotalCobrado').textContent = formatoMoneda(totalCobrado);
  document.getElementById('resDiferenciaCombustible').textContent = formatoMoneda(diferenciaCombustible);

  const resultadoEl = document.getElementById('resultadoFinal');
  const etiquetaEl = document.getElementById('resultadoEtiqueta');
  resultadoEl.textContent = formatoMoneda(resultadoFinal);

  resultadoEl.classList.remove('positivo', 'negativo', 'neutro');
  etiquetaEl.classList.remove('positivo', 'negativo', 'neutro');

  if (Math.abs(resultadoFinal) < 0.005) {
    etiquetaEl.textContent = 'CUADRADO';
    resultadoEl.classList.add('neutro');
    etiquetaEl.classList.add('neutro');
  } else if (resultadoFinal > 0) {
    etiquetaEl.textContent = 'SOBRA';
    resultadoEl.classList.add('positivo');
    etiquetaEl.classList.add('positivo');
  } else {
    etiquetaEl.textContent = 'FALTA';
    resultadoEl.classList.add('negativo');
    etiquetaEl.classList.add('negativo');
  }

  document.getElementById('alertaFaltante').classList.toggle('hidden', resultadoFinal >= UMBRAL_FALTANTE);

  guardarBorrador();
}

function guardarBorrador() {
  const datos = {};
  campos.forEach(id => { datos[id] = document.getElementById(id).value; });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
}

function cargarBorrador() {
  const guardado = localStorage.getItem(STORAGE_KEY);
  if (!guardado) return;
  const datos = JSON.parse(guardado);
  campos.forEach(id => {
    if (datos[id] !== undefined) document.getElementById(id).value = datos[id];
  });
}

function limpiarCamposTurno() {
  ['turno', 'totalVentas', 'efectivo', 'creditos', 'tarjetas', 'transferencias', 'cheques', 'ventaAceites'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('fecha').value = new Date().toISOString().slice(0, 10);
  const perfil = leerPerfil();
  document.getElementById('nombre').value = perfil ? perfil.nombre : '';
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(DETALLE_TARJETAS_KEY);
  localStorage.removeItem(DETALLE_TRANSFERENCIAS_KEY);
  recalcular();
}

function limpiarTurno() {
  if (!confirm('¿Limpiar todos los datos del turno actual?')) return;
  limpiarCamposTurno();
}

function cargarUltimoTurno() {
  const historial = leerHistorial();
  if (historial.length === 0) {
    alert('Todavía no hay turnos guardados.');
    return;
  }
  const ultimo = historial[0];
  document.getElementById('fecha').value = ultimo.fecha || '';
  document.getElementById('turno').value = ultimo.turno || '';
  document.getElementById('nombre').value = ultimo.nombre || '';
  document.getElementById('totalVentas').value = ultimo.totalVentas;
  document.getElementById('efectivo').value = ultimo.efectivo;
  document.getElementById('creditos').value = ultimo.creditos;
  document.getElementById('tarjetas').value = ultimo.tarjetas;
  document.getElementById('transferencias').value = ultimo.transferencias || 0;
  document.getElementById('cheques').value = ultimo.cheques;
  document.getElementById('ventaAceites').value = ultimo.ventaAceites;
  recalcular();
}

// --- Perfil del despachador ---

function leerPerfil() {
  const guardado = localStorage.getItem(PERFIL_KEY);
  return guardado ? JSON.parse(guardado) : null;
}

function guardarPerfil() {
  const nombre = document.getElementById('setupNombre').value.trim();
  if (!nombre) {
    alert('Escribe tu nombre para continuar.');
    return;
  }
  localStorage.setItem(PERFIL_KEY, JSON.stringify({ nombre }));
  mostrarDashboard();
}

function cambiarPerfil() {
  if (!confirm('¿Cambiar de usuario? Tendrás que volver a escribir el nombre.')) return;
  localStorage.removeItem(PERFIL_KEY);
  document.getElementById('setupNombre').value = '';
  mostrarVista('vistaSetup');
}

// --- Navegación entre vistas ---

function mostrarVista(idVista) {
  ['vistaSetup', 'vistaDashboard', 'vistaTurno'].forEach(id => {
    document.getElementById(id).classList.toggle('hidden', id !== idVista);
  });
  document.querySelector('header').classList.toggle('compacto', idVista !== 'vistaDashboard');
}

// --- Historial del navegador: que el botón "Atrás" cierre modales/vistas en vez de salir ---

const MODALES = ['modalEfectivo', 'modalTarjetas', 'modalTransferencias', 'modalHistorial', 'modalAnticipos', 'modalVale'];

function irAEstado(estado) {
  history.pushState(estado, '');
  aplicarEstado(estado);
}

function cerrarEstadoActual() {
  history.back();
}

function aplicarEstado(estado) {
  estado = estado || { pantalla: 'dashboard' };

  if (estado.pantalla === 'turno') {
    mostrarVista('vistaTurno');
  } else {
    mostrarDashboard();
  }

  MODALES.forEach(id => document.getElementById(id).classList.add('hidden'));
  if (estado.modal) {
    document.getElementById(estado.modal).classList.remove('hidden');
  }
}

window.addEventListener('popstate', event => {
  aplicarEstado(event.state);
});

function mostrarDashboard() {
  const perfil = leerPerfil();
  if (!perfil) {
    mostrarVista('vistaSetup');
    return;
  }

  document.getElementById('saludoDashboard').textContent = `Hola, ${perfil.nombre}`;

  const mesActual = new Date().toISOString().slice(0, 7);
  const turnosDelMes = filtrarPorMes(leerHistorial(), mesActual);
  const sumaSobraFalta = sumarResultados(turnosDelMes);
  const { texto, clase } = etiquetaResultado(sumaSobraFalta);

  const sobraFaltaEl = document.getElementById('dashSobraFalta');
  sobraFaltaEl.textContent = `${formatoMoneda(sumaSobraFalta)} ${texto}`;
  sobraFaltaEl.classList.remove('positivo', 'negativo', 'neutro');
  sobraFaltaEl.classList.add(clase);

  const anticiposDelMes = filtrarPorMes(leerAnticipos(), mesActual);
  const sumaAnticipos = anticiposDelMes.reduce((total, a) => total + a.monto, 0);
  document.getElementById('dashAnticipos').textContent = formatoMoneda(sumaAnticipos);

  const total = sumaSobraFalta + sumaAnticipos;
  const { clase: claseTotal } = etiquetaResultado(total);
  const totalEl = document.getElementById('dashTotal');
  totalEl.textContent = formatoMoneda(total);
  totalEl.classList.remove('positivo', 'negativo', 'neutro');
  totalEl.classList.add(claseTotal);

  mostrarVista('vistaDashboard');
}

function mostrarVistaTurno() {
  const perfil = leerPerfil();
  document.getElementById('nombre').value = perfil ? perfil.nombre : '';
  if (!document.getElementById('fecha').value) {
    document.getElementById('fecha').value = new Date().toISOString().slice(0, 10);
  }
  recalcular();
  irAEstado({ pantalla: 'turno' });
}

// --- Historial de turnos (por mes) ---

function leerHistorial() {
  const guardado = localStorage.getItem(HISTORIAL_KEY);
  return guardado ? JSON.parse(guardado) : [];
}

function guardarTurno() {
  const datos = {
    fecha: document.getElementById('fecha').value,
    turno: document.getElementById('turno').value,
    nombre: document.getElementById('nombre').value,
    totalVentas: num('totalVentas'),
    efectivo: num('efectivo'),
    creditos: num('creditos'),
    tarjetas: num('tarjetas'),
    transferencias: num('transferencias'),
    cheques: num('cheques'),
    ventaAceites: num('ventaAceites'),
  };
  const { resultadoFinal } = calcularTurno(datos);

  const registro = { ...datos, resultadoFinal, guardadoEn: new Date().toISOString() };
  const historial = agregarAlHistorial(leerHistorial(), registro);
  localStorage.setItem(HISTORIAL_KEY, JSON.stringify(historial));

  alert('Turno guardado.');
  limpiarCamposTurno();
  cerrarEstadoActual();
}

function etiquetaResultado(resultadoFinal) {
  if (Math.abs(resultadoFinal) < 0.005) return { texto: 'CUADRADO', clase: 'neutro' };
  return resultadoFinal > 0 ? { texto: 'SOBRA', clase: 'positivo' } : { texto: 'FALTA', clase: 'negativo' };
}

function renderizarHistorialDelMes() {
  const mes = document.getElementById('mesHistorial').value;
  const registros = filtrarPorMes(leerHistorial(), mes)
    .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));

  const contenedor = document.getElementById('listaHistorial');
  const totalEl = document.getElementById('totalMes');

  if (registros.length === 0) {
    contenedor.innerHTML = '<p class="hint">No hay turnos guardados ese mes.</p>';
    totalEl.textContent = '';
    return;
  }

  contenedor.innerHTML = registros.map(registro => {
    const { texto, clase } = etiquetaResultado(registro.resultadoFinal);
    const fechaTexto = registro.fecha || '(sin fecha)';
    const turnoTexto = registro.turno || '(sin turno)';
    const nombreTexto = registro.nombre || '(sin nombre)';
    return `
      <div class="historial-item">
        <div class="historial-encabezado">
          <strong>${fechaTexto} · ${turnoTexto}</strong>
          <span class="${clase}">${formatoMoneda(registro.resultadoFinal)} ${texto}</span>
        </div>
        <div class="historial-detalle">${nombreTexto} — Ventas: ${formatoMoneda(registro.totalVentas)}</div>
      </div>
    `;
  }).join('');

  const sumaMes = sumarResultados(registros);
  const { texto: textoMes } = etiquetaResultado(sumaMes);
  totalEl.innerHTML = `Suma del mes (${registros.length} turno${registros.length === 1 ? '' : 's'}): <strong>${formatoMoneda(sumaMes)} ${textoMes}</strong>`;
}

function mostrarHistorial() {
  const mesInput = document.getElementById('mesHistorial');
  if (!mesInput.value) {
    mesInput.value = new Date().toISOString().slice(0, 7);
  }
  renderizarHistorialDelMes();
  irAEstado({ pantalla: 'dashboard', modal: 'modalHistorial' });
}

function cerrarModalHistorial() {
  cerrarEstadoActual();
}

// --- Anticipos ---

function leerAnticipos() {
  const guardado = localStorage.getItem(ANTICIPOS_KEY);
  return guardado ? JSON.parse(guardado) : [];
}

function agregarAnticipo() {
  const fecha = document.getElementById('anticipoFecha').value;
  const nombre = document.getElementById('anticipoNombre').value.trim();
  const monto = parseFloat(document.getElementById('anticipoMonto').value);
  const concepto = document.getElementById('anticipoConcepto').value.trim();

  if (!nombre || isNaN(monto) || monto <= 0) {
    alert('Ingresa al menos el nombre del empleado y un monto válido.');
    return;
  }

  const anticipos = leerAnticipos();
  anticipos.unshift({ fecha, nombre, monto, concepto, guardadoEn: new Date().toISOString() });
  localStorage.setItem(ANTICIPOS_KEY, JSON.stringify(anticipos));

  document.getElementById('anticipoNombre').value = '';
  document.getElementById('anticipoMonto').value = '';
  document.getElementById('anticipoConcepto').value = '';

  renderizarAnticipos();
}

function eliminarAnticipo(indice) {
  const anticipos = leerAnticipos();
  anticipos.splice(indice, 1);
  localStorage.setItem(ANTICIPOS_KEY, JSON.stringify(anticipos));
  renderizarAnticipos();
}

function renderizarAnticipos() {
  const anticipos = leerAnticipos();
  const contenedor = document.getElementById('listaAnticipos');
  const totalEl = document.getElementById('totalAnticipos');

  if (anticipos.length === 0) {
    contenedor.innerHTML = '<p class="hint">Todavía no hay anticipos registrados.</p>';
    totalEl.textContent = '';
    return;
  }

  contenedor.innerHTML = anticipos.map((anticipo, indice) => `
    <div class="historial-item">
      <div class="historial-encabezado">
        <strong>${anticipo.fecha || '(sin fecha)'} · ${anticipo.nombre}</strong>
        <span>
          ${formatoMoneda(anticipo.monto)}
          <button type="button" class="btn-eliminar" data-indice="${indice}" title="Eliminar">✕</button>
        </span>
      </div>
      ${anticipo.concepto ? `<div class="historial-detalle">${anticipo.concepto}</div>` : ''}
    </div>
  `).join('');

  contenedor.querySelectorAll('.btn-eliminar').forEach(boton => {
    boton.addEventListener('click', () => eliminarAnticipo(parseInt(boton.dataset.indice, 10)));
  });

  const totalAnticipos = anticipos.reduce((total, a) => total + a.monto, 0);
  totalEl.innerHTML = `Total anticipos: <strong>${formatoMoneda(totalAnticipos)}</strong>`;
}

function mostrarAnticipos() {
  if (!document.getElementById('anticipoFecha').value) {
    document.getElementById('anticipoFecha').value = new Date().toISOString().slice(0, 10);
  }
  const perfil = leerPerfil();
  document.getElementById('anticipoNombre').value = perfil ? perfil.nombre : '';
  renderizarAnticipos();
  irAEstado({ pantalla: 'dashboard', modal: 'modalAnticipos' });
}

function cerrarModalAnticipos() {
  cerrarEstadoActual();
}

// --- Vale de caja (conectado al Google Sheet existente) ---

function filaVaciaVale() {
  const fila = document.createElement('div');
  fila.className = 'vale-item';
  fila.innerHTML = `
    <input type="text" class="vale-descripcion" placeholder="Descripción">
    <input type="number" class="vale-valor" inputmode="decimal" step="0.01" min="0" placeholder="0.00">
    <button type="button" class="btn-quitar-item" title="Quitar">✕</button>
  `;
  fila.querySelector('.btn-quitar-item').addEventListener('click', () => {
    fila.remove();
    actualizarTotalVale();
  });
  fila.querySelector('.vale-valor').addEventListener('input', actualizarTotalVale);
  return fila;
}

function actualizarTotalVale() {
  let total = 0;
  document.querySelectorAll('#valeItems .vale-valor').forEach(input => {
    total += parseFloat(input.value) || 0;
  });
  document.getElementById('valeTotal').textContent = formatoMoneda(total);
  return total;
}

function mostrarVale() {
  const perfil = leerPerfil();
  document.getElementById('valeCliente').value = '';
  document.getElementById('valeElaborado').value = perfil ? perfil.nombre : '';
  document.getElementById('valeEstado').textContent = '';
  document.getElementById('valeProximoNumero').textContent = '#...';

  const contenedor = document.getElementById('valeItems');
  contenedor.innerHTML = '';
  contenedor.appendChild(filaVaciaVale());
  actualizarTotalVale();

  irAEstado({ pantalla: 'dashboard', modal: 'modalVale' });
}

function cerrarModalVale() {
  cerrarEstadoActual();
}

function construirTicketValeHTML(datos) {
  const fecha = new Date().toLocaleDateString('es-EC');
  const fechaHora = new Date().toLocaleString('es-EC');

  const filas = datos.items.map(item =>
    `<div class="detalle-item"><span>${item.descripcion}</span><span>$${item.valor.toFixed(2)}</span></div>`
  ).join('');

  return `
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Vale de caja</title>
      <style>
        @page { size: A4; margin: 8mm; }
        html, body { margin: 0; padding: 0; }
        body { font-family: 'Courier New', monospace; font-weight: normal; color: #000; }
        .ticket { width: 100%; }
        .encabezado { text-align: center; border-bottom: 3px dashed #000; margin-bottom: 24px; padding-bottom: 20px; }
        .encabezado h2 { margin: 0 0 12px; font-size: 46px; font-weight: normal; }
        .encabezado p { margin: 0; font-size: 25px; }
        .datos { margin-bottom: 24px; font-size: 35px; }
        .datos div { padding: 7px 0; }
        .detalle-item { display: flex; justify-content: space-between; gap: 16px; padding: 11px 0; font-size: 37px; }
        .total { border-top: 3px solid #000; padding-top: 18px; margin-top: 20px; font-size: 46px; }
        .firma { margin-top: 60px; border-top: 1px dashed #000; padding-top: 24px; font-size: 33px; }
        .firma .linea-firma { margin-bottom: 60px; }
        .impreso { text-align: center; margin-top: 28px; font-size: 23px; }
      </style>
    </head>
    <body>
      <div class="ticket">
        <div class="encabezado">
          <h2>FASTGAS S.A.S.</h2>
          <p>DEBO Y PAGARE EL VALOR EXPRESADO EN ESTE DOCUMENTO A FASTGAS S.A.S.</p>
        </div>
        <div class="datos">
          <div>Recibo: ${datos.numeroRecibo}</div>
          <div>Fecha: ${fecha}</div>
          <div>Cliente: ${datos.cliente}</div>
        </div>
        <div class="detalle">${filas}</div>
        <div class="detalle-item total"><span>TOTAL:</span><span>$${datos.total.toFixed(2)}</span></div>
        <div class="firma">
          <div class="linea-firma">Firma: _________________________</div>
          <div>Elaborado por: ${datos.elaborado}</div>
        </div>
        <div class="impreso">Impreso el: ${fechaHora}</div>
      </div>
    </body>
    </html>
  `;
}

async function generarVale() {
  const cliente = document.getElementById('valeCliente').value.trim();
  const elaborado = document.getElementById('valeElaborado').value.trim();
  const items = Array.from(document.querySelectorAll('#valeItems .vale-item')).map(fila => ({
    descripcion: fila.querySelector('.vale-descripcion').value.trim(),
    valor: parseFloat(fila.querySelector('.vale-valor').value),
  }));

  if (!cliente) {
    alert('Ingresa el nombre del cliente.');
    return;
  }
  if (items.length === 0 || items.some(item => !item.descripcion || isNaN(item.valor) || item.valor <= 0)) {
    alert('Cada item necesita descripción y un valor válido.');
    return;
  }

  const total = actualizarTotalVale();
  const datos = { cliente, elaborado, total, items };

  const botonGenerar = document.getElementById('btnGenerarVale');
  const estadoEl = document.getElementById('valeEstado');
  botonGenerar.disabled = true;
  botonGenerar.textContent = 'Procesando...';
  estadoEl.textContent = '';

  try {
    const respuesta = await fetch(VALE_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(datos),
    });
    const resultado = await respuesta.json();

    if (!resultado.ok) throw new Error(resultado.error || 'Error desconocido');

    imprimirHTML(construirTicketValeHTML({ numeroRecibo: resultado.numeroRecibo, cliente, elaborado, total, items }));

    estadoEl.textContent = `Recibo #${resultado.numeroRecibo} generado correctamente.`;
    document.getElementById('valeCliente').value = '';
    const contenedor = document.getElementById('valeItems');
    contenedor.innerHTML = '';
    contenedor.appendChild(filaVaciaVale());
    actualizarTotalVale();
    document.getElementById('valeProximoNumero').textContent = '#' + (resultado.numeroRecibo + 1);
  } catch (err) {
    estadoEl.textContent = '';
    alert('No se pudo generar el recibo: ' + err.message);
  } finally {
    botonGenerar.disabled = false;
    botonGenerar.textContent = 'Generar e imprimir';
  }
}

// --- Compartir turno ---

function construirMensajeTurno() {
  const datos = {
    fecha: document.getElementById('fecha').value || '(sin fecha)',
    turno: document.getElementById('turno').value || '(sin turno)',
    nombre: document.getElementById('nombre').value || '(sin nombre)',
    totalVentas: num('totalVentas'),
    efectivo: num('efectivo'),
    creditos: num('creditos'),
    tarjetas: num('tarjetas'),
    transferencias: num('transferencias'),
    cheques: num('cheques'),
    ventaAceites: num('ventaAceites'),
  };
  const { totalCobrado, resultadoFinal } = calcularTurno(datos);
  const { texto } = etiquetaResultado(resultadoFinal);

  let mensaje = `*Control de Turno - ${datos.fecha} ${datos.turno}*\n`;
  mensaje += `Despachador: ${datos.nombre}\n\n`;
  mensaje += `Total ventas: ${formatoMoneda(datos.totalVentas)}\n`;
  mensaje += `Efectivo: ${formatoMoneda(datos.efectivo)}\n`;
  mensaje += `Créditos: ${formatoMoneda(datos.creditos)}\n`;
  mensaje += `Tarjetas: ${formatoMoneda(datos.tarjetas)}\n`;
  mensaje += `Transferencias: ${formatoMoneda(datos.transferencias)}\n`;
  mensaje += `Cheques: ${formatoMoneda(datos.cheques)}\n`;
  mensaje += `Total cobrado: ${formatoMoneda(totalCobrado)}\n`;
  mensaje += `Venta aceites: ${formatoMoneda(datos.ventaAceites)}\n\n`;
  mensaje += `*Resultado: ${formatoMoneda(resultadoFinal)} ${texto}*`;

  if (resultadoFinal < UMBRAL_FALTANTE) {
    mensaje += `\n\n⚠️ RECOMENDACIÓN: revisar bien las transferencias, los pedidos, los créditos y el efectivo.`;
  }

  return mensaje;
}

async function compartirTurno() {
  const mensaje = construirMensajeTurno();

  if (navigator.share) {
    try {
      await navigator.share({ text: mensaje });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }

  window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank');
}

// --- Imprimir turno (ticket angosto, para impresoras de recibos) ---

function construirTicketHTML() {
  const datos = {
    fecha: document.getElementById('fecha').value || '(sin fecha)',
    turno: document.getElementById('turno').value || '(sin turno)',
    nombre: document.getElementById('nombre').value || '(sin nombre)',
    totalVentas: num('totalVentas'),
    efectivo: num('efectivo'),
    creditos: num('creditos'),
    tarjetas: num('tarjetas'),
    transferencias: num('transferencias'),
    cheques: num('cheques'),
    ventaAceites: num('ventaAceites'),
  };
  const { totalCobrado, resultadoFinal } = calcularTurno(datos);
  const { texto } = etiquetaResultado(resultadoFinal);
  const horaImpresion = new Date().toLocaleString('es-EC');

  const filas = [
    ['Total ventas', formatoMoneda(datos.totalVentas)],
    ['Efectivo', formatoMoneda(datos.efectivo)],
    ['Créditos', formatoMoneda(datos.creditos)],
    ['Tarjetas', formatoMoneda(datos.tarjetas)],
    ['Transferencias', formatoMoneda(datos.transferencias)],
    ['Cheques', formatoMoneda(datos.cheques)],
    ['Total cobrado', formatoMoneda(totalCobrado)],
    ['Venta aceites', formatoMoneda(datos.ventaAceites)],
  ].map(([etiqueta, valor]) => `<div class="fila"><span>${etiqueta}</span><span>${valor}</span></div>`).join('');

  return `
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Ticket de turno</title>
      <style>
        @page { size: A4; margin: 8mm; }
        html, body { margin: 0; padding: 0; }
        body { font-family: 'Courier New', monospace; font-weight: normal; color: #000; }
        .ticket { width: 100%; }
        .linea { border-top: 3px dashed #000; margin: 22px 0; }
        .fila { display: flex; justify-content: space-between; gap: 16px; padding: 12px 0; font-size: 43px; }
        .resultado { text-align: center; margin-top: 30px; font-size: 54px; }
        .pie { text-align: center; margin-top: 34px; font-size: 29px; }
      </style>
    </head>
    <body>
      <div class="ticket">
        <div class="fila"><span>Fecha</span><span>${datos.fecha}</span></div>
        <div class="fila"><span>Turno</span><span>${datos.turno}</span></div>
        <div class="fila"><span>Despachador</span><span>${datos.nombre}</span></div>
        <div class="linea"></div>
        ${filas}
        <div class="linea"></div>
        <div class="resultado">${formatoMoneda(resultadoFinal)} ${texto}</div>
        <div class="pie">Impreso: ${horaImpresion}</div>
      </div>
    </body>
    </html>
  `;
}

function imprimirHTML(htmlCompleto) {
  const areaImpresion = document.getElementById('areaImpresion');
  const estiloMatch = htmlCompleto.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const cuerpoMatch = htmlCompleto.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const estilo = estiloMatch ? `<style>${estiloMatch[1]}</style>` : '';
  let cuerpo = cuerpoMatch ? cuerpoMatch[1] : htmlCompleto;
  cuerpo = cuerpo.replace(/<script[\s\S]*?<\/script>/gi, '');

  areaImpresion.innerHTML = estilo + cuerpo;
  setTimeout(() => {
    window.print();
  }, 200);
}

function imprimirTurno() {
  imprimirHTML(construirTicketHTML());
}

// --- Detalle de tarjetas y transferencias (registro uno por uno) ---

const CONFIG_DETALLE = {
  tarjetas: { storageKey: DETALLE_TARJETAS_KEY, campoId: 'tarjetas', refId: 'tarjetaReferencia', valorId: 'tarjetaValor', listaId: 'listaTarjetas', totalId: 'totalTarjetas', modalId: 'modalTarjetas', vacio: 'Todavía no hay tarjetas registradas en este turno.' },
  transferencias: { storageKey: DETALLE_TRANSFERENCIAS_KEY, campoId: 'transferencias', refId: 'transferenciaReferencia', valorId: 'transferenciaValor', listaId: 'listaTransferencias', totalId: 'totalTransferencias', modalId: 'modalTransferencias', vacio: 'Todavía no hay transferencias registradas en este turno.' },
};

function leerEntradasDetalle(tipo) {
  const guardado = localStorage.getItem(CONFIG_DETALLE[tipo].storageKey);
  return guardado ? JSON.parse(guardado) : [];
}

function guardarEntradasDetalle(tipo, entradas) {
  localStorage.setItem(CONFIG_DETALLE[tipo].storageKey, JSON.stringify(entradas));
}

function agregarEntradaDetalle(tipo) {
  const config = CONFIG_DETALLE[tipo];
  const referencia = document.getElementById(config.refId).value.trim();
  const valor = parseFloat(document.getElementById(config.valorId).value);

  if (isNaN(valor) || valor <= 0) {
    alert('Ingresa un valor válido.');
    return;
  }

  const entradas = leerEntradasDetalle(tipo);
  entradas.push({ referencia, valor });
  guardarEntradasDetalle(tipo, entradas);

  document.getElementById(config.refId).value = '';
  document.getElementById(config.valorId).value = '';
  document.getElementById(config.refId).focus();

  renderizarEntradasDetalle(tipo);
}

function eliminarEntradaDetalle(tipo, indice) {
  const entradas = leerEntradasDetalle(tipo);
  entradas.splice(indice, 1);
  guardarEntradasDetalle(tipo, entradas);
  renderizarEntradasDetalle(tipo);
}

function renderizarEntradasDetalle(tipo) {
  const config = CONFIG_DETALLE[tipo];
  const entradas = leerEntradasDetalle(tipo);
  const contenedor = document.getElementById(config.listaId);
  const totalEl = document.getElementById(config.totalId);

  if (entradas.length === 0) {
    contenedor.innerHTML = `<p class="hint">${config.vacio}</p>`;
  } else {
    contenedor.innerHTML = entradas.map((entrada, indice) => `
      <div class="historial-item">
        <div class="historial-encabezado">
          <strong>${entrada.referencia || '(sin referencia)'}</strong>
          <span>
            ${formatoMoneda(entrada.valor)}
            <button type="button" class="btn-eliminar" data-indice="${indice}" data-tipo="${tipo}" title="Eliminar">✕</button>
          </span>
        </div>
      </div>
    `).join('');

    contenedor.querySelectorAll('.btn-eliminar').forEach(boton => {
      boton.addEventListener('click', () => eliminarEntradaDetalle(boton.dataset.tipo, parseInt(boton.dataset.indice, 10)));
    });
  }

  const total = sumarEntradas(entradas);
  totalEl.innerHTML = `Total registrado: <strong>${formatoMoneda(total)}</strong>`;
}

function abrirModalDetalle(tipo) {
  renderizarEntradasDetalle(tipo);
  irAEstado({ pantalla: 'turno', modal: CONFIG_DETALLE[tipo].modalId });
}

function cerrarModalDetalle(tipo) {
  cerrarEstadoActual();
}

function usarTotalDetalle(tipo) {
  const total = sumarEntradas(leerEntradasDetalle(tipo));
  document.getElementById(CONFIG_DETALLE[tipo].campoId).value = total.toFixed(2);
  cerrarModalDetalle(tipo);
  recalcular();
}

// --- Modal de detalle de efectivo ---

function recalcularDetalleEfectivo() {
  const filas = Array.from(document.querySelectorAll('#modalEfectivo .detalle-fila')).map(fila => {
    const valor = parseFloat(fila.dataset.valor);
    const cantidad = parseInt(fila.querySelector('input').value, 10) || 0;
    const subtotal = valor * cantidad;
    fila.querySelector('.subtotal').textContent = formatoMoneda(subtotal);
    return { valor, cantidad };
  });
  const total = calcularTotalEfectivo(filas);
  document.getElementById('detalleTotal').textContent = formatoMoneda(total);
  return total;
}

function abrirModalEfectivo() {
  irAEstado({ pantalla: 'turno', modal: 'modalEfectivo' });
  recalcularDetalleEfectivo();
}

function cerrarModalEfectivo() {
  cerrarEstadoActual();
}

function usarDetalleEfectivo() {
  const total = recalcularDetalleEfectivo();
  document.getElementById('efectivo').value = total.toFixed(2);
  cerrarModalEfectivo();
  recalcular();
}

// --- Inicialización ---

document.addEventListener('DOMContentLoaded', () => {
  cargarBorrador();

  document.getElementById('versionApp').textContent = 'Versión ' + APP_VERSION;

  campos.forEach(id => {
    document.getElementById(id).addEventListener('input', recalcular);
  });

  document.getElementById('btnGuardarPerfil').addEventListener('click', guardarPerfil);
  document.getElementById('btnCambiarPerfil').addEventListener('click', cambiarPerfil);
  document.getElementById('btnIrTurno').addEventListener('click', mostrarVistaTurno);
  document.getElementById('btnVolverDashboard').addEventListener('click', cerrarEstadoActual);

  document.getElementById('btnLimpiar').addEventListener('click', limpiarTurno);
  document.getElementById('btnCargarUltimo').addEventListener('click', cargarUltimoTurno);
  document.getElementById('btnGuardar').addEventListener('click', guardarTurno);
  document.getElementById('btnCompartir').addEventListener('click', compartirTurno);
  document.getElementById('btnImprimir').addEventListener('click', imprimirTurno);
  document.getElementById('btnVerHistorial').addEventListener('click', mostrarHistorial);
  document.getElementById('btnCerrarHistorial').addEventListener('click', cerrarModalHistorial);
  document.getElementById('mesHistorial').addEventListener('change', renderizarHistorialDelMes);
  document.getElementById('btnAnticipos').addEventListener('click', mostrarAnticipos);
  document.getElementById('btnVale').addEventListener('click', mostrarVale);
  document.getElementById('btnCerrarVale').addEventListener('click', cerrarModalVale);
  document.getElementById('btnAgregarItemVale').addEventListener('click', () => {
    document.getElementById('valeItems').appendChild(filaVaciaVale());
  });
  document.getElementById('btnGenerarVale').addEventListener('click', generarVale);
  document.getElementById('btnCerrarAnticipos').addEventListener('click', cerrarModalAnticipos);
  document.getElementById('btnAgregarAnticipo').addEventListener('click', agregarAnticipo);
  document.getElementById('btnDetalleEfectivo').addEventListener('click', abrirModalEfectivo);
  document.getElementById('btnCancelarDetalle').addEventListener('click', cerrarModalEfectivo);
  document.getElementById('btnUsarDetalle').addEventListener('click', usarDetalleEfectivo);

  document.getElementById('btnDetalleTarjetas').addEventListener('click', () => abrirModalDetalle('tarjetas'));
  document.getElementById('btnCerrarTarjetas').addEventListener('click', () => cerrarModalDetalle('tarjetas'));
  document.getElementById('btnUsarTarjetas').addEventListener('click', () => usarTotalDetalle('tarjetas'));
  document.getElementById('btnAgregarTarjeta').addEventListener('click', () => agregarEntradaDetalle('tarjetas'));

  document.getElementById('btnDetalleTransferencias').addEventListener('click', () => abrirModalDetalle('transferencias'));
  document.getElementById('btnCerrarTransferencias').addEventListener('click', () => cerrarModalDetalle('transferencias'));
  document.getElementById('btnUsarTransferencias').addEventListener('click', () => usarTotalDetalle('transferencias'));
  document.getElementById('btnAgregarTransferencia').addEventListener('click', () => agregarEntradaDetalle('transferencias'));

  document.querySelectorAll('#modalEfectivo .detalle-fila input').forEach(input => {
    input.addEventListener('input', recalcularDetalleEfectivo);
  });

  mostrarDashboard();
});
