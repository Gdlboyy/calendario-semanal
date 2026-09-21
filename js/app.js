import { getWeekStart, getWeekDates, addWeeks, formatWeekRange } from './dateUtils.js';
import * as noteStore from './noteStore.js';
import { renderWeek } from './render.js';

const store = noteStore;
let currentWeekStart = getWeekStart(new Date());

const semanaEl = document.getElementById('semana');
const rangoEl = document.getElementById('rango-semana');

function render() {
  const weekDates = getWeekDates(currentWeekStart);
  rangoEl.textContent = formatWeekRange(weekDates);
  renderWeek({ container: semanaEl, weekDates, store });
}

function seedIfEmpty() {
  if (store.getAllNotes().length > 0) return;
  const [lunes, martes] = getWeekDates(currentWeekStart);
  store.addNote({ dia: lunes, tipo: 'tarea', titulo: 'Llamar proveedor', tamano: 'mediano', posicionX: 14, posicionY: 34 });
  store.addNote({ dia: lunes, tipo: 'nota', titulo: 'Revisar correo', tamano: 'mediano', posicionX: 44, posicionY: 104 });
  store.addNote({ dia: martes, tipo: 'actividad', titulo: 'Reunión con equipo 10am', tamano: 'grande', posicionX: 20, posicionY: 36, fijada: true });
}

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

seedIfEmpty();
store.subscribe(render);
