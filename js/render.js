import { formatDayLabel, isToday } from './dateUtils.js';

export function renderWeek({ container, weekDates, store }) {
  container.innerHTML = '';
  for (const dia of weekDates) {
    const columna = document.createElement('div');
    columna.className = 'dia-columna';
    columna.dataset.dia = dia;

    const label = document.createElement('span');
    label.className = 'dia-etiqueta';
    if (isToday(dia)) label.classList.add('dia-hoy');
    label.textContent = formatDayLabel(dia);
    columna.appendChild(label);

    const addBtn = document.createElement('button');
    addBtn.className = 'dia-agregar';
    addBtn.type = 'button';
    addBtn.textContent = '+';
    addBtn.dataset.dia = dia;
    columna.appendChild(addBtn);

    const notasDelDia = store.getNotesForDay(dia);
    if (notasDelDia.length === 0) {
      const vacio = document.createElement('p');
      vacio.className = 'dia-vacio';
      vacio.textContent = 'Sin pendientes';
      columna.appendChild(vacio);
    } else {
      for (const nota of notasDelDia) columna.appendChild(renderNota(nota));
    }

    container.appendChild(columna);
  }
}

export function renderNota(nota) {
  const el = document.createElement('div');
  el.className = `nota nota-${nota.tipo} tamano-${nota.tamano}`;
  if (!nota.completada) el.classList.add('activa');
  if (nota.completada) el.classList.add('completada');
  if (nota.fijada) el.classList.add('fijada');
  el.dataset.id = nota.id;
  el.style.left = `${nota.posicionX}px`;
  el.style.top = `${nota.posicionY}px`;

  const titulo = document.createElement('div');
  titulo.className = 'nota-titulo';
  titulo.textContent = nota.titulo;
  el.appendChild(titulo);

  if (nota.fijada) {
    const pin = document.createElement('span');
    pin.className = 'pin-badge';
    pin.textContent = '⭐';
    el.appendChild(pin);
  }

  if (nota.completada) {
    const check = document.createElement('span');
    check.className = 'nota-check';
    check.textContent = '✔';
    el.appendChild(check);
  }

  return el;
}
