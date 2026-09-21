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

unsubscribe();
store.resetStore();
assert.equal(store.getAllNotes().length, 0);

console.log('noteStore.test.mjs: all assertions passed');
