// Basic interactions: double-click icon to open matching window, close button, draggable windows and draggable icons with persistence.
(function(){
  const icons = document.querySelectorAll('.icon');
  const windows = document.querySelectorAll('.window');
  const taskbar = document.getElementById('taskbar-windows');
  const clock = document.getElementById('clock');

  // simple z-index tracker attached to the openWindow function (we'll define the function next)
  const openWindow = function(id){
    const win = document.getElementById(id);
    if(!win) return;
    win.style.display = 'block';
    openWindow.topZ = (openWindow.topZ || 20) + 1;
    win.style.zIndex = openWindow.topZ;
    win.setAttribute('aria-hidden','false');
    // si ya existe el botón en taskbar, actualizar su estado (restaurar visual)
    const tbBtn = taskbar.querySelector(`[data-win="${id}"]`);
    if (tbBtn) tbBtn.classList.remove('minimized');
    win.dataset.minimized = 'false';
    addTaskbarItem(id, win);
  };
  openWindow.topZ = 20;

  function closeWindow(id){
    const win = document.getElementById(id);
    if(!win) return;
    win.style.display = 'none';
    win.setAttribute('aria-hidden','true');
    // cerrar debe eliminar el ítem de la barra de tareas
    removeTaskbarItem(id);
  }

  // add dblclick and keyboard open (Enter)
  icons.forEach(icon=>{
    icon.addEventListener('dblclick', (e)=> {
      // if the icon was moved recently, ignore the dblclick
      if (icon._wasMoved) {
        e.stopImmediatePropagation();
        return;
      }
      openWindow(icon.dataset.window);
    });
    icon.addEventListener('keydown', (e)=> { if(e.key === 'Enter') openWindow(icon.dataset.window); });
  });

  // controls and window interactions
  document.querySelectorAll('.window').forEach(win=>{
    const closeBtn = win.querySelector('.close');
    closeBtn.addEventListener('click', ()=> closeWindow(win.id));

    // MINIMIZAR: ahora sólo oculta y marca la ventana como minimizada, NO quita el botón del taskbar
    const minBtn = win.querySelector('.minimize');
    minBtn.addEventListener('click', ()=> {
      win.style.display = 'none';
      win.setAttribute('aria-hidden','true');
      win.dataset.minimized = 'true';
      const tbBtn = taskbar.querySelector(`[data-win="${win.id}"]`);
      if (tbBtn) tbBtn.classList.add('minimized');
    });

    // clicking window brings to front
    win.addEventListener('pointerdown', ()=> { openWindow.topZ = (openWindow.topZ || 20) + 1; win.style.zIndex = openWindow.topZ; });

    // dragging window using pointer events
    const title = win.querySelector('.titlebar');
    let dragging = false;
    let offsetX=0, offsetY=0;

    const onPointerDown = (e) => {
      // Si el pointerdown viene desde los controles (botones), NO iniciar arrastre.
      if (e.target && e.target.closest && e.target.closest('.controls')) {
        return;
      }
      // only primary button for mouse
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true;
      openWindow.topZ = (openWindow.topZ || 20) + 1;
      win.style.zIndex = openWindow.topZ;
      offsetX = e.clientX - win.offsetLeft;
      offsetY = e.clientY - win.offsetTop;
      title.setPointerCapture && title.setPointerCapture(e.pointerId);
      document.body.style.userSelect = 'none';
    };
    const onPointerMove = (e) => {
      if(!dragging) return;
      let nx = e.clientX - offsetX;
      let ny = e.clientY - offsetY;
      nx = Math.max(8, Math.min(nx, window.innerWidth - win.clientWidth - 8));
      ny = Math.max(8, Math.min(ny, window.innerHeight - win.clientHeight - 44));
      win.style.left = nx + 'px';
      win.style.top = ny + 'px';
    };
    const onPointerUp = (e) => {
      if(!dragging) return;
      dragging = false;
      title.releasePointerCapture && title.releasePointerCapture(e.pointerId);
      document.body.style.userSelect = '';
    };
    title.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  });

  // taskbar items: one per open window
  function addTaskbarItem(id, win){
    // si ya existe, solo nos aseguramos de actualizar su texto y estado
    let existing = taskbar.querySelector(`[data-win="${id}"]`);
    if (existing) {
      // si la ventana está visible, quitar clase minimized
      if (win.style.display !== 'none' && win.getAttribute('aria-hidden') !== 'true') {
        existing.classList.remove('minimized');
      }
      return;
    }
    const btn = document.createElement('button');
    btn.className = 'tb-item';
    btn.textContent = win.querySelector('.title').textContent;
    btn.dataset.win = id;
    btn.addEventListener('click', ()=>{
      // toggle minimize/restore
      if(win.style.display === 'none' || win.getAttribute('aria-hidden') === 'true') {
        // restaurar
        win.style.display = 'block';
        win.setAttribute('aria-hidden','false');
        win.dataset.minimized = 'false';
        openWindow.topZ = (openWindow.topZ || 20) + 1;
        win.style.zIndex = openWindow.topZ;
        btn.classList.remove('minimized');
      } else {
        // minimizar (ocultar) pero mantener botón en taskbar
        win.style.display = 'none';
        win.setAttribute('aria-hidden','true');
        win.dataset.minimized = 'true';
        btn.classList.add('minimized');
      }
    });
    taskbar.appendChild(btn);
  }
  function removeTaskbarItem(id){
    const el = taskbar.querySelector(`[data-win="${id}"]`);
    if(el) el.remove();
  }

  // simple clock
  function updateClock(){
    const d = new Date();
    const h = String(d.getHours()).padStart(2,'0');
    const m = String(d.getMinutes()).padStart(2,'0');
    clock.textContent = `${h}:${m}`;
  }
  setInterval(updateClock,1000);
  updateClock();

  // ==========================
  // Drag de iconos (pointer events, rAF, persistencia)
  // ==========================
  (function(){
    const STORAGE_KEY = 'desktop_icon_positions_v1';
    const positions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

    // aplicar posiciones guardadas (si existen)
    icons.forEach(icon => {
      const id = icon.dataset.window || icon.getAttribute('id') || null;
      if (id && positions[id]) {
        icon.style.left = positions[id].x + 'px';
        icon.style.top = positions[id].y + 'px';
      }
      // inicializamos bandera
      icon._wasMoved = false;
    });

    icons.forEach(icon => {
      let isPointerDown = false;
      let startX = 0, startY = 0;
      let iconStartLeft = 0, iconStartTop = 0;
      let moved = false;
      let rafId = null;
      const MOVE_THRESHOLD = 6;

      const onPointerDown = (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        isPointerDown = true;
        moved = false;
        icon.classList.add('dragging');
        icon.setPointerCapture && icon.setPointerCapture(e.pointerId);

        startX = e.clientX;
        startY = e.clientY;
        iconStartLeft = parseInt(getComputedStyle(icon).left, 10) || 0;
        iconStartTop = parseInt(getComputedStyle(icon).top, 10) || 0;

        // bring to front visually
        icon.style.zIndex = (openWindow.topZ || 100) + 1;
        openWindow.topZ = parseInt(icon.style.zIndex, 10);

        e.preventDefault();
      };

      const onPointerMove = (e) => {
        if (!isPointerDown) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (!moved && (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD)) {
          moved = true;
        }
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          let nx = iconStartLeft + dx;
          let ny = iconStartTop + dy;
          nx = Math.max(0, Math.min(nx, window.innerWidth - icon.offsetWidth));
          ny = Math.max(0, Math.min(ny, window.innerHeight - 40 - icon.offsetHeight));
          icon.style.left = nx + 'px';
          icon.style.top = ny + 'px';
        });
      };

      const onPointerUp = (e) => {
        if (!isPointerDown) return;
        isPointerDown = false;
        icon.classList.remove('dragging');
        icon.releasePointerCapture && icon.releasePointerCapture(e.pointerId);

        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }

        if (moved) {
          icon._wasMoved = true;
          setTimeout(() => { icon._wasMoved = false; }, 400);
        }

        // guardar posición
        const id = icon.dataset.window || icon.getAttribute('id') || null;
        if (id) {
          positions[id] = {
            x: parseInt(icon.style.left, 10) || 0,
            y: parseInt(icon.style.top, 10) || 0
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
        }
      };

      icon.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);

      // Si el icono tiene un dblclick listener ya añadido arriba, la bandera icon._wasMoved evitará la apertura si se movió.
    });
  })();

})();