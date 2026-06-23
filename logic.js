// Lógica pura del control de turno (sin DOM) — reusable tal cual en otra plataforma.

function calcularTurno({ totalVentas, efectivo, creditos, tarjetas, transferencias, cheques, ventaAceites }) {
  const totalCobrado = efectivo + creditos + tarjetas + transferencias + cheques;
  const diferenciaCombustible = totalCobrado - totalVentas;
  const resultadoFinal = diferenciaCombustible - ventaAceites;
  return { totalCobrado, diferenciaCombustible, resultadoFinal };
}

function calcularTotalEfectivo(filas) {
  return filas.reduce((total, fila) => total + fila.valor * fila.cantidad, 0);
}

function sumarEntradas(entradas) {
  return entradas.reduce((total, entrada) => total + entrada.valor, 0);
}

function agregarAlHistorial(historial, turno) {
  return [turno, ...historial];
}

function filtrarPorMes(historial, mes) {
  return historial.filter(registro => (registro.fecha || '').slice(0, 7) === mes);
}

function sumarResultados(registros) {
  return registros.reduce((total, registro) => total + registro.resultadoFinal, 0);
}

if (typeof module !== 'undefined') {
  module.exports = { calcularTurno, calcularTotalEfectivo, sumarEntradas, agregarAlHistorial, filtrarPorMes, sumarResultados };
}
