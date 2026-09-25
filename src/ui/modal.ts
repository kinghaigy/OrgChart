/** Minimal promise-based modal to replace window.prompt (which some embedded/sandboxed contexts block). */
export function promptModal(message: string, defaultValue = ''): Promise<string | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const box = document.createElement('div');
    box.className = 'modal-box';

    const label = document.createElement('p');
    label.textContent = message;
    box.appendChild(label);

    const form = document.createElement('form');
    const input = document.createElement('input');
    input.type = 'text';
    input.value = defaultValue;
    form.appendChild(input);

    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    const okBtn = document.createElement('button');
    okBtn.type = 'submit';
    okBtn.textContent = 'OK';
    actions.append(cancelBtn, okBtn);
    form.appendChild(actions);
    box.appendChild(form);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function close(result: string | null) {
      document.body.removeChild(overlay);
      resolve(result);
    }

    cancelBtn.addEventListener('click', () => close(null));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(null);
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      close(input.value);
    });
    document.addEventListener(
      'keydown',
      function onKey(e) {
        if (e.key === 'Escape') {
          document.removeEventListener('keydown', onKey);
          close(null);
        }
      },
    );

    input.focus();
    input.select();
  });
}

/** Minimal promise-based confirm dialog to replace window.confirm. */
export function confirmModal(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const box = document.createElement('div');
    box.className = 'modal-box';
    const label = document.createElement('p');
    label.textContent = message;
    box.appendChild(label);

    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    const okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.textContent = 'OK';
    actions.append(cancelBtn, okBtn);
    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function close(result: boolean) {
      document.body.removeChild(overlay);
      resolve(result);
    }

    cancelBtn.addEventListener('click', () => close(false));
    okBtn.addEventListener('click', () => close(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
    });
  });
}
