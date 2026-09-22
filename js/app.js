import { getWeekStart, getWeekDates, addWeeks, formatWeekRange } from './dateUtils.js';
import * as noteStore from './firestoreStore.js';
import { renderWeek } from './render.js';
import { initModal, openModal, attachModalHandlers } from './modal.js';
import { showUndoToast } from './toast.js';
import { attachDragHandlers } from './dragDrop.js';

const store = noteStore;
let currentWeekStart = getWeekStart(new Date());
let mobileDayIndex = 0;

const semanaEl = document.getElementById('semana');
const rangoEl = document.getElementById('rango-semana');

function render() {
  const weekDates = getWeekDates(currentWeekStart);
  rangoEl.textContent = formatWeekRange(weekDates);
  renderWeek({ container: semanaEl, weekDates, store });

  const columnas = semanaEl.querySelectorAll('.dia-columna');
  columnas.forEach((columna, index) => {
    columna.classList.toggle('visible-movil', index === mobileDayIndex);
  });
}

function handleSave(id, patch) {
  store.updateNote(id, patch);
}

function handleDelete(id) {
  store.removeNote(id).then((eliminada) => {
    if (eliminada) {
      showUndoToast('Nota eliminada.', () => store.restoreNote(eliminada));
    }
  });
}

initModal({ onSave: handleSave, onDelete: handleDelete });
attachModalHandlers();

function handleNotaClick(id) {
  const nota = store.getAllNotes().find((n) => n.id === id);
  if (nota) openModal(nota);
}

attachDragHandlers(semanaEl, { store, onClick: handleNotaClick });

semanaEl.addEventListener('click', (event) => {
  const boton = event.target.closest('.dia-agregar');
  if (!boton) return;
  store.addNote({
    dia: boton.dataset.dia,
    tipo: 'tarea',
    titulo: 'Nueva nota',
    posicionX: 20,
    posicionY: 40,
  }).then((nueva) => openModal(nueva));
});

document.getElementById('semana-anterior').addEventListener('click', () => {
  currentWeekStart = addWeeks(currentWeekStart, -1);
  render();
});
document.getElementById('semana-siguiente').addEventListener('click', () => {
  currentWeekStart = addWeeks(currentWeekStart, 1);
  render();
});
document.getElementById('semana-hoy').addEventListener('click', () => {
  currentWeekStart = getWeekStart(new Date());
  render();
});

let swipeStartX = null;

semanaEl.addEventListener('touchstart', (event) => {
  swipeStartX = event.touches[0].clientX;
});

semanaEl.addEventListener('touchend', (event) => {
  if (swipeStartX === null) return;
  const deltaX = event.changedTouches[0].clientX - swipeStartX;
  swipeStartX = null;
  if (Math.abs(deltaX) < 50) return;

  if (deltaX < 0 && mobileDayIndex < 6) mobileDayIndex += 1;
  if (deltaX > 0 && mobileDayIndex > 0) mobileDayIndex -= 1;
  render();
});

store.subscribe(render);
