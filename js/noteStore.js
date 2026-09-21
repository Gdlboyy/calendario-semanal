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

export function getNotesForDay(dia) {
  return notes.filter((n) => n.dia === dia);
}

export function getAllNotes() {
  return notes.slice();
}

export function resetStore() {
  notes = [];
  notify();
}
