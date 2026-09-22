let toastTimeout = null;
let limpiezaTimeout = null;

export function showUndoToast(message, onUndo) {
  mostrar(message, { texto: 'Deshacer', accion: onUndo });
}

export function showToast(message) {
  mostrar(message);
}

function mostrar(message, boton) {
  const toast = document.getElementById('toast');
  clearTimeout(toastTimeout);
  clearTimeout(limpiezaTimeout);
  toast.innerHTML = '';

  const texto = document.createElement('span');
  texto.textContent = message;
  toast.appendChild(texto);

  if (boton) {
    const el = document.createElement('button');
    el.type = 'button';
    el.textContent = boton.texto;
    el.className = 'toast-deshacer';
    el.addEventListener('click', () => {
      boton.accion();
      hideToast();
    });
    toast.appendChild(el);
  } else {
    toast.style.paddingRight = '18px';
  }

  toast.classList.add('toast-visible');
  toastTimeout = setTimeout(hideToast, boton ? 5000 : 2200);
}

function hideToast() {
  const toast = document.getElementById('toast');
  toast.classList.remove('toast-visible');
  limpiezaTimeout = setTimeout(() => {
    toast.innerHTML = '';
    toast.style.paddingRight = '';
  }, 400);
}
