import { TIPOS, TAMANOS } from './render.js';

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

let panel;
let caja;
let campos;
let estado = null;
let callbacks = {};
let focoPrevio = null;

export function initModal({ onGuardar, onEliminar }) {
  callbacks = { onGuardar, onEliminar };
  panel = document.getElementById('modal-nota');
  caja = panel.querySelector('.panel-caja');
  campos = {
    etiqueta: document.getElementById('panel-encabezado'),
    titulo: document.getElementById('modal-titulo'),
    descripcion: document.getElementById('modal-descripcion'),
    dia: document.getElementById('modal-dia'),
    tipos: document.getElementById('modal-tipo'),
    tamanos: document.getElementById('modal-tamano'),
    fijada: document.getElementById('modal-fijada'),
    completada: document.getElementById('modal-completada'),
  };

  panel.querySelectorAll('[data-cerrar]').forEach((el) => el.addEventListener('click', cerrarPanel));

  campos.tipos.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-valor]');
    if (chip) elegirTipo(chip.dataset.valor);
  });

  campos.tamanos.addEventListener('click', (event) => {
    const boton = event.target.closest('[data-valor]');
    if (boton) elegirTamano(boton.dataset.valor);
  });

  campos.titulo.addEventListener('input', () => campos.titulo.classList.remove('error'));
  campos.fijada.addEventListener('click', () => alternar('fijada'));
  campos.completada.addEventListener('click', () => alternar('completada'));

  document.getElementById('modal-guardar').addEventListener('click', guardar);
  document.getElementById('modal-eliminar').addEventListener('click', () => {
    if (!estado?.id) return;
    callbacks.onEliminar(estado.id);
    cerrarPanel();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panelAbierto()) cerrarPanel();
  });

  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      guardar();
    } else if (event.key === 'Enter' && event.target === campos.titulo) {
      event.preventDefault();
      campos.descripcion.focus();
    }
  });
}

export function panelAbierto() {
  return panel.classList.contains('abierto');
}

export function abrirPanel(nota, { crear = false } = {}) {
  focoPrevio = document.activeElement;
  estado = {
    id: crear ? null : nota.id,
    tipo: TIPOS.includes(nota.tipo) ? nota.tipo : 'tarea',
    tamano: TAMANOS.includes(nota.tamano) ? nota.tamano : 'mediano',
    fijada: Boolean(nota.fijada),
    completada: Boolean(nota.completada),
    diaOriginal: nota.dia,
  };

  campos.etiqueta.textContent = crear ? 'Nueva nota' : 'Editar nota';
  campos.titulo.value = crear ? '' : (nota.titulo ?? '');
  campos.descripcion.value = nota.descripcion ?? '';
  campos.dia.value = nota.dia ?? '';
  campos.titulo.classList.remove('error');
  elegirTipo(estado.tipo);
  elegirTamano(estado.tamano);
  pintarInterruptor(campos.fijada, estado.fijada);
  pintarInterruptor(campos.completada, estado.completada);

  panel.classList.toggle('creando', crear);
  panel.setAttribute('aria-hidden', 'false');
  panel.classList.add('abierto');
  setTimeout(() => {
    campos.titulo.focus();
    if (!crear) campos.titulo.setSelectionRange(campos.titulo.value.length, campos.titulo.value.length);
  }, 180);
}

export function cerrarPanel() {
  if (!panelAbierto()) return;
  panel.classList.remove('abierto');
  panel.setAttribute('aria-hidden', 'true');
  estado = null;
  if (focoPrevio?.isConnected) focoPrevio.focus({ preventScroll: true });
}

function elegirTipo(tipo) {
  if (!TIPOS.includes(tipo)) return;
  estado.tipo = tipo;
  TIPOS.forEach((t) => caja.classList.toggle(`tipo-${t}`, t === tipo));
  campos.tipos.querySelectorAll('[data-valor]').forEach((chip) => {
    chip.setAttribute('aria-checked', String(chip.dataset.valor === tipo));
  });
}

function elegirTamano(tamano) {
  if (!TAMANOS.includes(tamano)) return;
  estado.tamano = tamano;
  campos.tamanos.querySelectorAll('[data-valor]').forEach((boton) => {
    boton.setAttribute('aria-checked', String(boton.dataset.valor === tamano));
  });
}

function alternar(clave) {
  estado[clave] = !estado[clave];
  pintarInterruptor(campos[clave], estado[clave]);
}

function pintarInterruptor(boton, activo) {
  boton.setAttribute('aria-pressed', String(activo));
}

function guardar() {
  if (!estado) return;
  const titulo = campos.titulo.value.trim().slice(0, 120);
  if (!titulo) {
    campos.titulo.classList.remove('error');
    void campos.titulo.offsetWidth;
    campos.titulo.classList.add('error');
    campos.titulo.focus();
    return;
  }

  const dia = FECHA_ISO.test(campos.dia.value) ? campos.dia.value : estado.diaOriginal;
  callbacks.onGuardar(estado.id, {
    titulo,
    descripcion: campos.descripcion.value.trim().slice(0, 2000),
    tipo: estado.tipo,
    tamano: estado.tamano,
    fijada: estado.fijada,
    completada: estado.completada,
    dia,
  }, { cambioDeDia: dia !== estado.diaOriginal });
  cerrarPanel();
}
