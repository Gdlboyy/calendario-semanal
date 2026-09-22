import { TIPOS, partesFecha } from './render.js';

const DIA_MS = 24 * 60 * 60 * 1000;
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

let panel;
let lista;
let conteo;
let vaciar;
let callbacks = {};
let diasVida = 30;
let focoPrevio = null;
let confirmacionTimeout = null;

export function initPapelera({ onRestaurar, onBorrar, onVaciar, dias }) {
  callbacks = { onRestaurar, onBorrar, onVaciar };
  diasVida = dias;
  panel = document.getElementById('panel-papelera');
  lista = document.getElementById('papelera-lista');
  conteo = document.getElementById('papelera-conteo');
  vaciar = document.getElementById('papelera-vaciar');

  document.getElementById('papelera').addEventListener('click', abrirPapelera);
  panel.querySelectorAll('[data-cerrar]').forEach((el) => el.addEventListener('click', cerrarPapelera));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panel.classList.contains('abierto')) cerrarPapelera();
  });

  lista.addEventListener('click', (event) => {
    const restaurar = event.target.closest('[data-restaurar]');
    if (restaurar) {
      callbacks.onRestaurar(restaurar.dataset.restaurar);
      return;
    }
    const borrar = event.target.closest('[data-borrar]');
    if (borrar) confirmarYHacer(borrar, () => callbacks.onBorrar(borrar.dataset.borrar));
  });

  vaciar.addEventListener('click', () => confirmarYHacer(vaciar, () => callbacks.onVaciar(), '¿Seguro? Toca otra vez'));
}

function confirmarYHacer(boton, accion, textoConfirmar = '¿Seguro?') {
  const original = boton.innerHTML;
  const restablecer = () => {
    boton.dataset.confirmando = '';
    boton.innerHTML = original;
  };

  if (boton.dataset.confirmando === 'si') {
    clearTimeout(confirmacionTimeout);
    boton.innerHTML = boton.dataset.original;
    boton.dataset.confirmando = '';
    accion();
    return;
  }
  boton.dataset.original = original;
  boton.dataset.confirmando = 'si';
  boton.textContent = textoConfirmar;
  clearTimeout(confirmacionTimeout);
  confirmacionTimeout = setTimeout(() => {
    if (boton.isConnected && boton.dataset.confirmando === 'si') restablecer();
  }, 3000);
}

export function abrirPapelera() {
  focoPrevio = document.activeElement;
  panel.classList.add('abierto');
  panel.setAttribute('aria-hidden', 'false');
  setTimeout(() => panel.querySelector('.panel-x').focus(), 150);
}

export function cerrarPapelera() {
  if (!panel.classList.contains('abierto')) return;
  panel.classList.remove('abierto');
  panel.setAttribute('aria-hidden', 'true');
  if (focoPrevio?.isConnected) focoPrevio.focus({ preventScroll: true });
}

function textoRestante(eliminadaEn) {
  const restantes = Math.max(0, Math.ceil((eliminadaEn + diasVida * DIA_MS - Date.now()) / DIA_MS));
  if (restantes <= 1) return 'se borra hoy';
  return `se borra en ${restantes} días`;
}

export function renderPapelera(notas) {
  if (notas.length > 0) {
    conteo.hidden = false;
    conteo.textContent = notas.length > 99 ? '99+' : notas.length;
  } else {
    conteo.hidden = true;
  }
  vaciar.disabled = notas.length === 0;

  lista.innerHTML = '';
  if (notas.length === 0) {
    const vacio = document.createElement('li');
    vacio.className = 'papelera-vacia';
    vacio.innerHTML = '<span>✦</span>La papelera está vacía';
    lista.appendChild(vacio);
    return;
  }

  for (const nota of notas) {
    const tipo = TIPOS.includes(nota.tipo) ? nota.tipo : 'nota';
    const item = document.createElement('li');
    item.className = `papelera-item tipo-${tipo}`;

    const punto = document.createElement('span');
    punto.className = 'papelera-punto';

    const info = document.createElement('div');
    info.className = 'papelera-info';
    const titulo = document.createElement('strong');
    titulo.textContent = nota.titulo || 'Sin título';
    const detalle = document.createElement('small');
    const dia = typeof nota.dia === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(nota.dia) ? nota.dia : null;
    const fecha = dia ? (() => { const { numero, corto, fecha: f } = partesFecha(dia); return `${corto} ${numero} ${MESES[f.getMonth()]}`; })() : 'Sin fecha';
    detalle.textContent = `${fecha} · ${textoRestante(Number(nota.eliminadaEn) || Date.now())}`;
    info.append(titulo, detalle);

    const restaurar = document.createElement('button');
    restaurar.type = 'button';
    restaurar.className = 'mini-boton';
    restaurar.dataset.restaurar = nota.id;
    restaurar.textContent = 'Restaurar';

    const borrar = document.createElement('button');
    borrar.type = 'button';
    borrar.className = 'mini-boton mini-peligro';
    borrar.dataset.borrar = nota.id;
    borrar.title = 'Borrar para siempre';
    borrar.setAttribute('aria-label', 'Borrar para siempre');
    borrar.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

    item.append(punto, info, restaurar, borrar);
    lista.appendChild(item);
  }
}
