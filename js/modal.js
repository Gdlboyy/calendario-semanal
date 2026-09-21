let modalEl = null;
let currentId = null;
let onSaveCallback = null;
let onDeleteCallback = null;

export function initModal({ onSave, onDelete }) {
  onSaveCallback = onSave;
  onDeleteCallback = onDelete;
  modalEl = document.getElementById('modal-nota');
}

export function openModal(nota) {
  currentId = nota.id;
  document.getElementById('modal-titulo').value = nota.titulo;
  document.getElementById('modal-descripcion').value = nota.descripcion;
  document.getElementById('modal-completada').checked = nota.completada;
  modalEl.classList.add('modal-abierto');
}

export function closeModal() {
  modalEl.classList.remove('modal-abierto');
  currentId = null;
}

export function attachModalHandlers() {
  document.getElementById('modal-guardar').addEventListener('click', () => {
    if (!currentId) return;
    onSaveCallback(currentId, {
      titulo: document.getElementById('modal-titulo').value,
      descripcion: document.getElementById('modal-descripcion').value,
      completada: document.getElementById('modal-completada').checked,
    });
    closeModal();
  });

  document.getElementById('modal-eliminar').addEventListener('click', () => {
    if (!currentId) return;
    onDeleteCallback(currentId);
    closeModal();
  });

  document.getElementById('modal-cerrar').addEventListener('click', closeModal);
}
