import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import {
  getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc,
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';
import { firebaseConfig } from './firebaseConfig.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const notasRef = collection(db, 'notas');

let cache = [];
const listeners = new Set();

function notify() {
  for (const listener of listeners) listener(cache.slice());
}

export function subscribe(listener) {
  listeners.add(listener);
  listener(cache.slice());
  return () => listeners.delete(listener);
}

onSnapshot(
  notasRef,
  (snapshot) => {
    cache = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
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

export function getNotesForDay(dia) {
  return cache.filter((n) => n.dia === dia);
}

export function getAllNotes() {
  return cache.slice();
}
