const UMBRAL_ARRASTRE = 5;
const MARGEN = 8;

let pendingClickTimeout = null;

export function attachDragHandlers(container, { onClick, onMover, onToggleCompletar, onToggleFijar, onPapelera }) {
  container.addEventListener('click', (event) => {
    const accion = event.target.closest('[data-accion="completar"]');
    if (!accion) return;
    const nota = accion.closest('.nota');
    if (nota) onToggleCompletar(nota.dataset.id);
  });

  container.addEventListener('dblclick', (event) => {
    const nota = event.target.closest('.nota');
    if (!nota || event.target.closest('[data-accion]')) return;
    clearTimeout(pendingClickTimeout);
    pendingClickTimeout = null;
    onToggleFijar(nota.dataset.id);
  });

  container.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const nota = event.target.closest('.nota');
    if (!nota || event.target.closest('[data-accion]')) return;

    const id = nota.dataset.id;
    const lienzoOrigen = nota.closest('.dia-lienzo');
    const startX = event.clientX;
    const startY = event.clientY;
    let arrastrando = false;
    let offsetX = 0;
    let offsetY = 0;
    let fantasma = null;
    let columnaResaltada = null;

    function resaltar(columna) {
      if (columna === columnaResaltada) return;
      columnaResaltada?.classList.remove('destino');
      columnaResaltada = columna;
      columnaResaltada?.classList.add('destino');
    }

    function destinoEn(x, y) {
      const bajoPuntero = document.elementFromPoint(x, y);
      const papelera = bajoPuntero?.closest('#papelera');
      if (papelera) return { papelera };
      const tab = bajoPuntero?.closest('.tab-dia');
      if (tab) return { dia: tab.dataset.dia, lienzo: null, tab };
      const columna = bajoPuntero?.closest('.dia-columna');
      if (columna && columna.offsetParent !== null) {
        return { dia: columna.dataset.dia, lienzo: columna.querySelector('.dia-lienzo'), columna };
      }
      return null;
    }

    function empezar() {
      arrastrando = true;
      const rect = nota.getBoundingClientRect();
      offsetX = startX - rect.left;
      offsetY = startY - rect.top;

      fantasma = document.createElement('div');
      fantasma.className = 'nota-fantasma';
      fantasma.style.left = `${nota.offsetLeft}px`;
      fantasma.style.top = `${nota.offsetTop}px`;
      fantasma.style.width = `${rect.width}px`;
      fantasma.style.height = `${rect.height}px`;
      lienzoOrigen?.appendChild(fantasma);

      nota.classList.remove('entra', 'aterriza', 'recien-completada');
      nota.style.transformOrigin = `${offsetX}px ${offsetY}px`;
      nota.style.width = `${rect.width}px`;
      nota.style.left = `${rect.left}px`;
      nota.style.top = `${rect.top}px`;
      nota.classList.add('volando');
      document.body.appendChild(nota);
      document.body.classList.add('arrastrando');
    }

    function onMove(moveEvent) {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (!arrastrando) {
        if (Math.abs(dx) < UMBRAL_ARRASTRE && Math.abs(dy) < UMBRAL_ARRASTRE) return;
        clearTimeout(pendingClickTimeout);
        empezar();
      }
      nota.style.left = `${moveEvent.clientX - offsetX}px`;
      nota.style.top = `${moveEvent.clientY - offsetY}px`;
      const destino = destinoEn(moveEvent.clientX, moveEvent.clientY);
      resaltar(destino?.papelera ?? destino?.columna ?? destino?.tab ?? null);
      nota.classList.toggle('sobre-papelera', Boolean(destino?.papelera));
    }

    function limpiar() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey);
      resaltar(null);
      fantasma?.remove();
      document.body.classList.remove('arrastrando');
    }

    function aterrizarEn(lienzo, x, y, rebote) {
      nota.classList.remove('volando', 'sobre-papelera');
      nota.style.transformOrigin = '';
      nota.style.width = '';
      nota.style.left = `${x}px`;
      nota.style.top = `${y}px`;
      if (rebote) nota.classList.add('aterriza');
      lienzo.appendChild(nota);
    }

    function onUp(upEvent) {
      limpiar();
      if (!arrastrando) {
        clearTimeout(pendingClickTimeout);
        pendingClickTimeout = setTimeout(() => onClick(id), 260);
        return;
      }

      const destino = destinoEn(upEvent.clientX, upEvent.clientY);
      if (!destino) {
        cancelarVuelo();
        return;
      }

      if (destino.papelera) {
        tragar(destino.papelera);
        onPapelera(id);
        return;
      }

      if (!destino.lienzo) {
        nota.remove();
        onMover(id, { dia: destino.dia, posicionX: 12, posicionY: 12 }, { apilar: true });
        return;
      }

      const r = destino.lienzo.getBoundingClientRect();
      const ancho = nota.offsetWidth;
      const x = Math.round(Math.min(Math.max(0, upEvent.clientX - offsetX - r.left), Math.max(0, r.width - ancho - MARGEN)));
      const y = Math.round(Math.max(0, upEvent.clientY - offsetY - r.top));
      aterrizarEn(destino.lienzo, x, y);
      onMover(id, { dia: destino.dia, posicionX: x, posicionY: y });
    }

    function tragar(papelera) {
      const r = papelera.getBoundingClientRect();
      nota.style.transition = 'left .38s cubic-bezier(.5,0,.75,0), top .38s cubic-bezier(.5,0,.75,0), transform .38s ease-in, opacity .38s ease-in';
      nota.style.left = `${r.left + r.width / 2 - nota.offsetWidth / 2}px`;
      nota.style.top = `${r.top + r.height / 2 - nota.offsetHeight / 2}px`;
      nota.style.transform = 'scale(.06) rotate(-18deg)';
      nota.style.opacity = '0';
      papelera.classList.add('tragando');
      setTimeout(() => nota.remove(), 400);
      setTimeout(() => papelera.classList.remove('tragando'), 750);
    }

    function cancelarVuelo() {
      if (lienzoOrigen?.isConnected) {
        aterrizarEn(lienzoOrigen, parseFloat(fantasma?.style.left) || 0, parseFloat(fantasma?.style.top) || 0, true);
      } else {
        nota.remove();
        onMover(id, {});
      }
    }

    function onCancel() {
      limpiar();
      if (arrastrando) cancelarVuelo();
    }

    function onKey(keyEvent) {
      if (keyEvent.key === 'Escape') onCancel();
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey);
  });
}
