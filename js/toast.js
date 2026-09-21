let toastTimeout = null;

export function showUndoToast(message, onUndo) {
  const toast = document.getElementById('toast');
  clearTimeout(toastTimeout);
  toast.innerHTML = '';
  const texto = document.createElement('span');
  texto.textContent = message;
  toast.appendChild(texto);

  const boton = document.createElement('button');
  boton.type = 'button';
  boton.textContent = 'Deshacer';
  boton.className = 'toast-deshacer';
  boton.addEventListener('click', () => {
    onUndo();
    hideToast();
  });
  toast.appendChild(boton);

  toast.classList.add('toast-visible');
  toastTimeout = setTimeout(hideToast, 5000);
}

function hideToast() {
  const toast = document.getElementById('toast');
  toast.classList.remove('toast-visible');
  toast.innerHTML = '';
}
