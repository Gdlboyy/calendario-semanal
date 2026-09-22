let notes = [];
let idCounter = 0;
const listeners = new Set();

function generateId() {
  idCounter += 1;
  return `local-${Date.now()}-${idCounter}`;
}

function notify() {
  for (const listener of listeners) listener(notes.slice());
}

export function subscribe(listener) {
  listeners.add(listener);
  listener(notes.slice());
  return () => listeners.delete(listener);
}

export function addNote(partial) {
  const nota = {
    id: partial.id || generateId(),
    dia: partial.dia,
    tipo: partial.tipo,
    titulo: partial.titulo || '',
    descripcion: partial.descripcion || '',
    color: partial.color || partial.tipo,
    posicionX: partial.posicionX ?? 20,
    posicionY: partial.posicionY ?? 40,
    tamano: partial.tamano || 'mediano',
    fijada: partial.fijada ?? false,
    completada: partial.completada ?? false,
    creadoEn: partial.creadoEn ?? Date.now(),
  };
  notes.push(nota);
  notify();
  return nota;
}

export function updateNote(id, patch) {
  const nota = notes.find((n) => n.id === id);
  if (!nota) return null;
  Object.assign(nota, patch);
  notify();
  return nota;
}

export function removeNote(id) {
  const index = notes.findIndex((n) => n.id === id);
  if (index === -1) return null;
  const [removed] = notes.splice(index, 1);
  notify();
  return removed;
}

export function restoreNote(nota) {
  notes.push(nota);
  notify();
  return nota;
}

export const DIAS_PAPELERA = 30;
const VIDA_PAPELERA_MS = DIAS_PAPELERA * 24 * 60 * 60 * 1000;

function activas() {
  return notes.filter((n) => !n.eliminadaEn);
}

export function moverAPapelera(id, ahora = Date.now()) {
  return updateNote(id, { eliminadaEn: ahora });
}

export function restaurarDePapelera(id) {
  const nota = notes.find((n) => n.id === id);
  if (!nota) return null;
  delete nota.eliminadaEn;
  notify();
  return nota;
}

export function getPapelera() {
  return notes.filter((n) => n.eliminadaEn).sort((a, b) => b.eliminadaEn - a.eliminadaEn);
}

export function purgarPapelera(ahora = Date.now()) {
  const vencidas = notes.filter((n) => n.eliminadaEn && ahora - n.eliminadaEn > VIDA_PAPELERA_MS);
  if (vencidas.length === 0) return [];
  notes = notes.filter((n) => !vencidas.includes(n));
  notify();
  return vencidas;
}

export function getNotesForDay(dia) {
  return activas().filter((n) => n.dia === dia);
}

export function getAllNotes() {
  return activas();
}

export function resetStore() {
  notes = [];
  notify();
}
