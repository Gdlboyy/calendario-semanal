import { isToday, toISODate } from './dateUtils.js';

export const TIPOS = ['tarea', 'nota', 'pendiente', 'actividad'];
export const TAMANOS = ['chico', 'mediano', 'grande'];

const NOMBRE_TIPO = { tarea: 'Tarea', nota: 'Nota', pendiente: 'Pendiente', actividad: 'Actividad' };
const ANCHO = { chico: 132, mediano: 172, grande: 212 };
const ALTO = { chico: 76, mediano: 102, grande: 136 };
const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const CHECK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

// Recuerda el estado anterior de cada nota para animar solo lo que cambió.
const estadoPrevio = new Map();
let idAterrizaje = null;

export function marcarAterrizaje(id) {
  idAterrizaje = id;
}

export function normalizarNota(nota) {
  return {
    ...nota,
    tipo: TIPOS.includes(nota.tipo) ? nota.tipo : 'nota',
    tamano: TAMANOS.includes(nota.tamano) ? nota.tamano : 'mediano',
    posicionX: Math.max(0, Number(nota.posicionX) || 0),
    posicionY: Math.max(0, Number(nota.posicionY) || 0),
    titulo: String(nota.titulo ?? ''),
    descripcion: String(nota.descripcion ?? ''),
  };
}

export function altoEstimado(tamano) {
  return ALTO[tamano] ?? ALTO.mediano;
}

export function partesFecha(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const fecha = new Date(y, m - 1, d);
  return { numero: d, corto: DIAS_CORTOS[fecha.getDay()], fecha };
}

export function renderWeek({ container, weekDates, store, animarColumnas }) {
  const hoyISO = toISODate(new Date());
  container.innerHTML = '';
  let contadorEntradas = 0;

  weekDates.forEach((dia, indice) => {
    const notas = store.getNotesForDay(dia).map(normalizarNota)
      .sort((a, b) => Number(a.fijada) - Number(b.fijada));
    const pendientes = notas.filter((n) => !n.completada).length;
    const { numero, corto } = partesFecha(dia);

    const columna = document.createElement('section');
    columna.className = 'dia-columna';
    columna.dataset.dia = dia;
    columna.style.setProperty('--i', indice);
    if (animarColumnas) columna.classList.add('con-entrada');
    if (isToday(dia)) columna.classList.add('es-hoy');
    else if (dia < hoyISO) columna.classList.add('pasado');

    const cabecera = document.createElement('header');
    cabecera.className = 'dia-cabecera';

    const fecha = document.createElement('div');
    fecha.className = 'dia-fecha';
    const num = document.createElement('span');
    num.className = 'dia-numero';
    num.textContent = numero;
    const nombre = document.createElement('span');
    nombre.className = 'dia-nombre';
    nombre.textContent = corto;
    fecha.append(num, nombre);

    const meta = document.createElement('div');
    meta.className = 'dia-meta';
    if (isToday(dia)) {
      const chip = document.createElement('span');
      chip.className = 'dia-hoy-chip';
      chip.textContent = 'HOY';
      meta.appendChild(chip);
    }
    if (pendientes > 0) {
      const conteo = document.createElement('span');
      conteo.className = 'dia-conteo';
      conteo.title = `${pendientes} sin completar`;
      conteo.textContent = pendientes;
      meta.appendChild(conteo);
    }
    const agregar = document.createElement('button');
    agregar.type = 'button';
    agregar.className = 'dia-agregar';
    agregar.dataset.dia = dia;
    agregar.title = 'Agregar nota';
    agregar.setAttribute('aria-label', `Agregar nota el ${corto} ${numero}`);
    agregar.textContent = '+';
    meta.appendChild(agregar);

    cabecera.append(fecha, meta);

    const lienzo = document.createElement('div');
    lienzo.className = 'dia-lienzo';
    lienzo.dataset.dia = dia;

    if (notas.length === 0) {
      const vacio = document.createElement('p');
      vacio.className = 'dia-vacio';
      vacio.innerHTML = '<span>✦</span>Sin pendientes';
      lienzo.appendChild(vacio);
    }

    let altoNecesario = 0;
    for (const nota of notas) {
      const el = renderNota(nota);
      const previo = estadoPrevio.get(nota.id);
      if (!previo) {
        el.classList.add('entra');
        el.style.setProperty('--retraso', `${Math.min(contadorEntradas, 12) * 45 + (animarColumnas ? 200 : 0)}ms`);
        contadorEntradas += 1;
      } else if (!previo.completada && nota.completada) {
        el.classList.add('recien-completada');
      }
      if (nota.id === idAterrizaje) el.classList.add('aterriza');
      estadoPrevio.set(nota.id, { completada: nota.completada });
      altoNecesario = Math.max(altoNecesario, nota.posicionY + altoEstimado(nota.tamano) + 40);
      lienzo.appendChild(el);
    }
    if (altoNecesario > 380) lienzo.style.minHeight = `${altoNecesario}px`;

    columna.append(cabecera, lienzo);
    container.appendChild(columna);
  });

  idAterrizaje = null;
}

export function renderNota(nota) {
  const el = document.createElement('article');
  el.className = `nota nota-${nota.tipo} tamano-${nota.tamano}`;
  el.classList.add(nota.completada ? 'completada' : 'activa');
  if (nota.fijada) el.classList.add('fijada');
  el.dataset.id = nota.id;

  const ancho = ANCHO[nota.tamano];
  el.style.left = `max(0px, min(${nota.posicionX}px, calc(100% - min(${ancho}px, calc(100% - 16px)) - 8px)))`;
  el.style.top = `${nota.posicionY}px`;

  const titulo = document.createElement('div');
  titulo.className = 'nota-titulo';
  titulo.textContent = nota.titulo || 'Sin título';
  el.appendChild(titulo);

  if (nota.descripcion) {
    const desc = document.createElement('div');
    desc.className = 'nota-desc';
    desc.textContent = nota.descripcion;
    el.appendChild(desc);
  }

  const pie = document.createElement('div');
  pie.className = 'nota-pie';
  const tipo = document.createElement('span');
  tipo.className = 'nota-tipo';
  tipo.textContent = NOMBRE_TIPO[nota.tipo];
  const hecho = document.createElement('button');
  hecho.type = 'button';
  hecho.className = 'nota-hecho-btn';
  hecho.dataset.accion = 'completar';
  hecho.setAttribute('aria-label', nota.completada ? 'Marcar como pendiente' : 'Marcar como completada');
  hecho.title = nota.completada ? 'Marcar como pendiente' : 'Marcar como completada';
  hecho.innerHTML = CHECK_SVG;
  pie.append(tipo, hecho);
  el.appendChild(pie);

  if (nota.fijada) {
    const pin = document.createElement('span');
    pin.className = 'pin-badge';
    pin.textContent = '★';
    el.appendChild(pin);
  }

  if (nota.completada) {
    const check = document.createElement('span');
    check.className = 'nota-check';
    check.innerHTML = CHECK_SVG;
    el.appendChild(check);
  }

  return el;
}
