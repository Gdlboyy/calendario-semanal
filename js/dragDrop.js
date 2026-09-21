const DRAG_THRESHOLD = 5;

let pendingClickTimeout = null;

export function attachDragHandlers(container, { store, onClick }) {
  container.addEventListener('pointerdown', (event) => {
    const nota = event.target.closest('.nota');
    if (!nota) return;

    const columnaOrigen = nota.closest('.dia-columna');
    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = parseFloat(nota.style.left) || 0;
    const startTop = parseFloat(nota.style.top) || 0;
    let moved = false;

    nota.setPointerCapture(event.pointerId);
    nota.style.cursor = 'grabbing';

    function onMove(moveEvent) {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) moved = true;
      if (moved) {
        nota.style.left = `${startLeft + dx}px`;
        nota.style.top = `${startTop + dy}px`;
      }
    }

    function onUp(upEvent) {
      nota.releasePointerCapture(event.pointerId);
      nota.style.cursor = 'grab';
      container.removeEventListener('pointermove', onMove);
      container.removeEventListener('pointerup', onUp);

      if (!moved) {
        clearTimeout(pendingClickTimeout);
        pendingClickTimeout = setTimeout(() => onClick(nota.dataset.id), 300);
        return;
      }

      nota.style.visibility = 'hidden';
      const destino = document.elementFromPoint(upEvent.clientX, upEvent.clientY)?.closest('.dia-columna') || columnaOrigen;
      nota.style.visibility = '';
      const destRect = destino.getBoundingClientRect();
      const nuevoX = Math.max(0, upEvent.clientX - destRect.left - nota.offsetWidth / 2);
      const nuevoY = Math.max(0, upEvent.clientY - destRect.top - nota.offsetHeight / 2);

      store.updateNote(nota.dataset.id, {
        dia: destino.dataset.dia,
        posicionX: Math.round(nuevoX),
        posicionY: Math.round(nuevoY),
      });
    }

    container.addEventListener('pointermove', onMove);
    container.addEventListener('pointerup', onUp);
  });

  container.addEventListener('dblclick', (event) => {
    const nota = event.target.closest('.nota');
    if (!nota) return;
    clearTimeout(pendingClickTimeout);
    pendingClickTimeout = null;
    const actual = store.getAllNotes().find((n) => n.id === nota.dataset.id);
    if (actual) store.updateNote(actual.id, { fijada: !actual.fijada });
  });
}
