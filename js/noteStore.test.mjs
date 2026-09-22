// js/noteStore.test.mjs
import assert from 'node:assert/strict';
import * as store from './noteStore.js';

store.resetStore();

// addNote fills defaults and notifies subscribers
let received = null;
const unsubscribe = store.subscribe((notes) => { received = notes; });
const nota = store.addNote({ dia: '2026-06-15', tipo: 'tarea', titulo: 'Probar' });
assert.equal(nota.tipo, 'tarea');
assert.equal(nota.completada, false);
assert.equal(nota.fijada, false);
assert.equal(nota.tamano, 'mediano');
assert.equal(received.length, 1);

// updateNote merges fields
store.updateNote(nota.id, { completada: true });
assert.equal(store.getAllNotes()[0].completada, true);

// getNotesForDay filters by day
store.addNote({ dia: '2026-06-16', tipo: 'nota', titulo: 'Otro día' });
assert.equal(store.getNotesForDay('2026-06-15').length, 1);
assert.equal(store.getNotesForDay('2026-06-16').length, 1);

// removeNote removes and returns the removed note; restoreNote brings it back
const eliminada = store.removeNote(nota.id);
assert.equal(eliminada.id, nota.id);
assert.equal(store.getAllNotes().length, 1);
store.restoreNote(eliminada);
assert.equal(store.getAllNotes().length, 2);

// Papelera: la nota sale del tablero, se puede restaurar y se purga a los 30 días
const DIA_MS = 24 * 60 * 60 * 1000;
const aBorrar = store.addNote({ dia: '2026-06-17', tipo: 'tarea', titulo: 'A la papelera' });
store.moverAPapelera(aBorrar.id, 1000);
assert.equal(store.getNotesForDay('2026-06-17').length, 0);
assert.equal(store.getPapelera().length, 1);
store.restaurarDePapelera(aBorrar.id);
assert.equal(store.getNotesForDay('2026-06-17').length, 1);
assert.equal(store.getPapelera().length, 0);

store.moverAPapelera(aBorrar.id, 1000);
assert.equal(store.purgarPapelera(1000 + 29 * DIA_MS).length, 0);
assert.equal(store.getPapelera().length, 1);
assert.equal(store.purgarPapelera(1000 + 31 * DIA_MS).length, 1);
assert.equal(store.getPapelera().length, 0);

unsubscribe();
store.resetStore();
assert.equal(store.getAllNotes().length, 0);

console.log('noteStore.test.mjs: all assertions passed');
