import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import {
  getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, deleteField,
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';
import { firebaseConfig } from './firebaseConfig.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const notasRef = collection(db, 'notas');

export const DIAS_PAPELERA = 30;
const VIDA_PAPELERA_MS = DIAS_PAPELERA * 24 * 60 * 60 * 1000;

let cache = [];
const listeners = new Set();

function activas() {
  return cache.filter((n) => !n.eliminadaEn);
}

function notify() {
  for (const listener of listeners) listener(activas());
}

export function subscribe(listener) {
  listeners.add(listener);
  listener(activas());
  return () => listeners.delete(listener);
}

// Sin servidor propio, la limpieza de la papelera la hace cualquier navegador que abra el tablero.
function purgarPapelera() {
  const limite = Date.now() - VIDA_PAPELERA_MS;
  cache
    .filter((n) => n.eliminadaEn && n.eliminadaEn < limite)
    .forEach((n) => deleteDoc(doc(db, 'notas', n.id)).catch((error) => console.warn('No se pudo purgar', n.id, error)));
}

onSnapshot(
  notasRef,
  (snapshot) => {
    cache = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    purgarPapelera();
    notify();
    document.getElementById('estado-conexion')?.classList.remove('visible');
  },
  (error) => {
    console.error('Firestore desconectado:', error);
    document.getElementById('estado-conexion')?.classList.add('visible');
  },
);

export async function addNote(partial) {
  const nota = {
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
    creadoEn: Date.now(),
  };
  const ref = await addDoc(notasRef, nota);
  return { id: ref.id, ...nota };
}

export async function updateNote(id, patch) {
  await updateDoc(doc(db, 'notas', id), patch);
  return null;
}

export async function removeNote(id) {
  const nota = cache.find((n) => n.id === id);
  if (!nota) return null;
  await deleteDoc(doc(db, 'notas', id));
  return nota;
}

export async function restoreNote(nota) {
  const { id, ...datos } = nota;
  const ref = await addDoc(notasRef, datos);
  return { id: ref.id, ...datos };
}

export async function moverAPapelera(id) {
  await updateDoc(doc(db, 'notas', id), { eliminadaEn: Date.now() });
}

export async function restaurarDePapelera(id) {
  await updateDoc(doc(db, 'notas', id), { eliminadaEn: deleteField() });
}

export function getPapelera() {
  return cache.filter((n) => n.eliminadaEn).sort((a, b) => b.eliminadaEn - a.eliminadaEn);
}

export function getNotesForDay(dia) {
  return activas().filter((n) => n.dia === dia);
}

export function getAllNotes() {
  return activas();
}
