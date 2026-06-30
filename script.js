// Basic interactions: double-click icon to open matching window, close button, draggable windows and draggable icons with persistence.
(function(){
  const icons = document.querySelectorAll('.icon');
  const windows = document.querySelectorAll('.window');
  const taskbar = document.getElementById('taskbar-windows');
  const clock = document.getElementById('clock');

  // 🛠️ CORRECCIÓN 1: Movida aquí arriba para que el resto del script la reconozca desde el inicio
  function updateTaskbarFocus(activeWindowId) {
    taskbar.querySelectorAll('.tb-item').forEach(btn => {
      if (btn.dataset.win === activeWindowId) {
        btn.classList.add('focus');
        btn.classList.remove('minimized'); 
      } else {
        btn.classList.remove('focus');
      }
    });
  }

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
    updateTaskbarFocus(id);
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
      if (tbBtn) {
        tbBtn.classList.add('minimized');
        tbBtn.classList.remove('focus'); // 🛠️ CORRECCIÓN 2: Quitar foco al minimizar desde la ventana
      }
    });

    // clicking window brings to front
    win.addEventListener('pointerdown', ()=> { openWindow.topZ = (openWindow.topZ || 20) + 1; win.style.zIndex = openWindow.topZ; updateTaskbarFocus(win.id); });

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
      updateTaskbarFocus(win.id);
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
    let existing = taskbar.querySelector(`[data-win="${id}"]`);
    if (existing) {
      if (win.style.display !== 'none' && win.getAttribute('aria-hidden') !== 'true') {
        existing.classList.remove('minimized');
      }
      return;
    }
    const btn = document.createElement('button');
    btn.className = 'tb-item';
    btn.dataset.win = id;

    // 🛠️ AGREGA EL ÍCONO DE FORMA DINÁMICA
    // Lee la ruta de la imagen desde el HTML de tu ventana. Si no encuentra ninguna, usa una por defecto.
    const iconSrc = win.dataset.icon || 'images/default-icon.png'; 
    
    const img = document.createElement('img');
    img.src = iconSrc;
    img.alt = '';
    
    const span = document.createElement('span');
    span.textContent = win.querySelector('.title').textContent;

    // Metemos primero la imagen y luego el texto adentro del botón
    btn.appendChild(img);
    btn.appendChild(span);
    
    btn.addEventListener('click', ()=>{
      const isMinimized = win.style.display === 'none' || win.getAttribute('aria-hidden') === 'true';
      const isFocused = btn.classList.contains('focus');

      if (isMinimized || !isFocused) {
        win.style.display = 'block';
        win.setAttribute('aria-hidden','false');
        win.dataset.minimized = 'false';
        openWindow.topZ = (openWindow.topZ || 20) + 1;
        win.style.zIndex = openWindow.topZ;
        updateTaskbarFocus(id); 
      } else {
        win.style.display = 'none';
        win.setAttribute('aria-hidden','true');
        win.dataset.minimized = 'true';
        btn.classList.add('minimized');
        btn.classList.remove('focus'); 
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
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2,'0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; // convierte 0 en 12
    clock.textContent = `${h}:${m} ${ampm}`;
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

        if (moved) {
          icon._wasMoved = true;
          setTimeout(() => { icon._wasMoved = false; }, 50);
          
          const id = icon.dataset.window || icon.getAttribute('id') || null;
          if (id) {
            positions[id] = { x: parseInt(icon.style.left), y: parseInt(icon.style.top) };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
          }
        }
      };

      icon.addEventListener('pointerdown', onPointerDown);
      icon.addEventListener('pointermove', onPointerMove);
      icon.addEventListener('pointerup', onPointerUp);
    });
  })();
})();