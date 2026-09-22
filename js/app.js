import { getWeekStart, getWeekDates, addWeeks, formatWeekRange, toISODate } from './dateUtils.js';
import * as store from './firestoreStore.js';
import { renderWeek, marcarAterrizaje, normalizarNota, altoEstimado, partesFecha } from './render.js';
import { initModal, abrirPanel, panelAbierto } from './modal.js';
import { showUndoToast, showToast } from './toast.js';
import { attachDragHandlers } from './dragDrop.js';

const semanaEl = document.getElementById('semana');
const rangoEl = document.getElementById('rango-semana');
const tabsEl = document.getElementById('tabs-movil');
const progresoHechas = document.getElementById('progreso-hechas');
const progresoTotal = document.getElementById('progreso-total');
const progresoRelleno = document.getElementById('progreso-relleno');

let currentWeekStart = getWeekStart(new Date());
let mobileDayIndex = indiceDeHoy();
let semanaPintada = null;
let renderPendiente = false;
let progresoPrevio = { semana: null, total: 0, completa: false };

function indiceDeHoy() {
  return getWeekDates(currentWeekStart).indexOf(toISODate(new Date()));
}

function render() {
  if (document.body.classList.contains('arrastrando')) {
    renderPendiente = true;
    return;
  }
  renderPendiente = false;

  const weekDates = getWeekDates(currentWeekStart);
  if (mobileDayIndex < 0) mobileDayIndex = 0;
  rangoEl.textContent = formatWeekRange(weekDates);

  const animarColumnas = semanaPintada !== weekDates[0];
  semanaPintada = weekDates[0];
  renderWeek({ container: semanaEl, weekDates, store, animarColumnas });

  semanaEl.querySelectorAll('.dia-columna').forEach((columna, index) => {
    columna.classList.toggle('visible-movil', index === mobileDayIndex);
  });

  renderTabs(weekDates);
  renderProgreso(weekDates);
}

function renderTabs(weekDates) {
  tabsEl.innerHTML = '';
  weekDates.forEach((dia, index) => {
    const { numero, corto } = partesFecha(dia);
    const pendientes = store.getNotesForDay(dia).filter((n) => !n.completada).length;
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'tab-dia';
    tab.dataset.dia = dia;
    tab.dataset.indice = index;
    if (index === mobileDayIndex) tab.classList.add('activo');
    if (dia === toISODate(new Date())) tab.classList.add('es-hoy');
    if (pendientes > 0) tab.dataset.pendientes = pendientes;
    const pequeno = document.createElement('small');
    pequeno.textContent = corto.toUpperCase();
    const grande = document.createElement('strong');
    grande.textContent = numero;
    tab.append(pequeno, grande);
    tabsEl.appendChild(tab);
  });
}

function renderProgreso(weekDates) {
  const notas = weekDates.flatMap((dia) => store.getNotesForDay(dia));
  const hechas = notas.filter((n) => n.completada).length;
  progresoHechas.textContent = hechas;
  progresoTotal.textContent = notas.length;
  progresoRelleno.style.width = notas.length ? `${(hechas / notas.length) * 100}%` : '0%';

  const completa = notas.length > 0 && hechas === notas.length;
  const mismaSemana = progresoPrevio.semana === weekDates[0];
  if (completa && mismaSemana && progresoPrevio.total > 0 && !progresoPrevio.completa) {
    showToast('Semana al día: todo completado');
  }
  progresoPrevio = { semana: weekDates[0], total: notas.length, completa };
}

function posicionLibre(dia, excluirId) {
  const notas = store.getNotesForDay(dia).filter((n) => n.id !== excluirId).map(normalizarNota);
  const y = notas.reduce((max, n) => Math.max(max, n.posicionY + altoEstimado(n.tamano) + 14), 14);
  return { posicionX: 12, posicionY: y };
}

function avisarError(error) {
  console.error(error);
  showToast('No se pudo guardar. Revisa tu conexión.');
}

function describirDia(dia) {
  const { numero, corto } = partesFecha(dia);
  return `${corto} ${numero}`;
}

function fueraDeSemana(dia) {
  return !getWeekDates(currentWeekStart).includes(dia);
}

function onGuardar(id, datos, { cambioDeDia }) {
  if (!id) {
    store.addNote({ ...datos, ...posicionLibre(datos.dia) }).catch(avisarError);
    if (fueraDeSemana(datos.dia)) showToast(`Nota creada para el ${describirDia(datos.dia)}`);
    return;
  }
  const patch = cambioDeDia ? { ...datos, ...posicionLibre(datos.dia, id) } : datos;
  store.updateNote(id, patch).catch(avisarError);
  if (cambioDeDia && fueraDeSemana(datos.dia)) showToast(`Nota movida al ${describirDia(datos.dia)}`);
}

function onEliminar(id) {
  store.removeNote(id)
    .then((eliminada) => {
      if (eliminada) showUndoToast('Nota eliminada', () => store.restoreNote(eliminada).catch(avisarError));
    })
    .catch(avisarError);
}

function onMover(id, patch, { apilar = false } = {}) {
  if (!patch.dia) {
    render();
    return;
  }
  const final = apilar ? { ...patch, ...posicionLibre(patch.dia, id) } : patch;
  marcarAterrizaje(id);
  store.updateNote(id, final).catch(avisarError);
  if (apilar) showToast(`Nota movida al ${describirDia(patch.dia)}`);
}

function buscarNota(id) {
  return store.getAllNotes().find((n) => n.id === id);
}

initModal({ onGuardar, onEliminar });

attachDragHandlers(semanaEl, {
  onClick: (id) => {
    const nota = buscarNota(id);
    if (nota) abrirPanel(nota);
  },
  onMover,
  onToggleCompletar: (id) => {
    const nota = buscarNota(id);
    if (nota) store.updateNote(id, { completada: !nota.completada }).catch(avisarError);
  },
  onToggleFijar: (id) => {
    const nota = buscarNota(id);
    if (nota) store.updateNote(id, { fijada: !nota.fijada }).catch(avisarError);
  },
});

document.addEventListener('pointerup', () => {
  if (renderPendiente) setTimeout(render, 0);
});
document.addEventListener('pointercancel', () => {
  if (renderPendiente) setTimeout(render, 0);
});

function nuevaNota(dia) {
  abrirPanel({ dia, tipo: 'tarea', tamano: 'mediano', fijada: false, completada: false, descripcion: '' }, { crear: true });
}

semanaEl.addEventListener('click', (event) => {
  const boton = event.target.closest('.dia-agregar');
  if (boton) nuevaNota(boton.dataset.dia);
});

tabsEl.addEventListener('click', (event) => {
  const tab = event.target.closest('.tab-dia');
  if (!tab) return;
  mobileDayIndex = Number(tab.dataset.indice);
  render();
});

function cambiarSemana(delta) {
  currentWeekStart = addWeeks(currentWeekStart, delta);
  render();
}

function irAHoy() {
  currentWeekStart = getWeekStart(new Date());
  mobileDayIndex = indiceDeHoy();
  render();
}

document.getElementById('semana-anterior').addEventListener('click', () => cambiarSemana(-1));
document.getElementById('semana-siguiente').addEventListener('click', () => cambiarSemana(1));
document.getElementById('semana-hoy').addEventListener('click', irAHoy);

document.addEventListener('keydown', (event) => {
  if (panelAbierto() || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target.closest('input, textarea, select, [contenteditable]')) return;
  const tecla = event.key.toLowerCase();
  if (event.key === 'ArrowLeft') cambiarSemana(-1);
  else if (event.key === 'ArrowRight') cambiarSemana(1);
  else if (tecla === 't') irAHoy();
  else if (tecla === 'n') {
    event.preventDefault();
    nuevaNota(toISODate(new Date()));
  }
});

let swipeStartX = null;
let swipeStartY = null;

semanaEl.addEventListener('touchstart', (event) => {
  if (event.target.closest('.nota')) {
    swipeStartX = null;
    return;
  }
  swipeStartX = event.touches[0].clientX;
  swipeStartY = event.touches[0].clientY;
}, { passive: true });

semanaEl.addEventListener('touchend', (event) => {
  if (swipeStartX === null) return;
  const deltaX = event.changedTouches[0].clientX - swipeStartX;
  const deltaY = event.changedTouches[0].clientY - swipeStartY;
  swipeStartX = null;
  if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) return;

  if (deltaX < 0) {
    if (mobileDayIndex < 6) mobileDayIndex += 1;
    else { mobileDayIndex = 0; cambiarSemana(1); return; }
  } else if (mobileDayIndex > 0) {
    mobileDayIndex -= 1;
  } else {
    mobileDayIndex = 6;
    cambiarSemana(-1);
    return;
  }
  render();
});

store.subscribe(render);
