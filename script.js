// script.js — fuerza todos los iconos en la misma columna izquierda y guarda posiciones
(function(){
  const ICON_POS_KEY = 'desktop_icon_positions_v1';
  const icons = document.querySelectorAll('.icon');
  const taskbar = document.getElementById('taskbar-windows');
  const clock = document.getElementById('clock');

  // -------------------------
  // Layout fijo: todos en la misma columna izquierda (left = 20)
  // Orden de arriba a abajo:
  // About Me, Projects, Skills, Contact, System, Resume
  // -------------------------
  (function applyFixedLeftColumnAndPersist(){
    const spacingY = 84; // separación vertical entre íconos
    const startLeft = 20; // columna izquierda fija
    const startTop = 20;

    const order = [
      'win-about',    // About Me
      'win-projects', // Projects
      'win-skills',   // Skills
      'win-contact',  // Contact
      'win-system',   // System
      'win-resume'    // Resume (debajo de System)
    ];

    // cargar (o crear) objeto de posiciones
    const positions = JSON.parse(localStorage.getItem(ICON_POS_KEY) || '{}');

    order.forEach((id, idx) => {
      // buscar icon por data-window
      let icon = document.querySelector(`.icon[data-window="${id}"]`);
      // fallback por etiqueta visible (por si algo cambió)
      if (!icon) {
        icon = Array.from(document.querySelectorAll('.icon')).find(el => {
          const label = (el.querySelector('.icon-label') || { textContent: '' }).textContent.trim().toLowerCase();
          return label && label.includes(id.replace('win-','').replace(/-/g,' '));
        });
      }
      const left = startLeft;
      const top = startTop + idx * spacingY;
      if (icon) {
        icon.style.left = left + 'px';
        icon.style.top = top + 'px';
        // persistir con la key correspondiente
        positions[id] = { x: left, y: top };
      }
    });

    localStorage.setItem(ICON_POS_KEY, JSON.stringify(positions));
    console.log('Layout fijo aplicado: todos los iconos en columna izquierda; posiciones guardadas.');
  })();

  // -------------------------
  // Resto del script: apertura de ventanas, barra de tareas, arrastre y persistencia
  // -------------------------
  function updateTaskbarFocus(activeWindowId) {
    if (!taskbar) return;
    taskbar.querySelectorAll('.tb-item').forEach(btn => {
      if (btn.dataset.win === activeWindowId) {
        btn.classList.add('focus');
        btn.classList.remove('minimized');
      } else {
        btn.classList.remove('focus');
      }
    });
  }

  const openWindow = function(id){
    const win = document.getElementById(id);
    if(!win) return;
    win.style.display = 'block';
    openWindow.topZ = (openWindow.topZ || 20) + 1;
    win.style.zIndex = openWindow.topZ;
    win.setAttribute('aria-hidden','false');
    const tbBtn = taskbar && taskbar.querySelector(`[data-win="${id}"]`);
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
    removeTaskbarItem(id);
  }

  // Doble click / Enter en icons
  icons.forEach(icon=>{
    icon.addEventListener('dblclick', (e)=> {
      if (icon._wasMoved) { e.stopImmediatePropagation(); return; }
      openWindow(icon.dataset.window);
    });
    icon.addEventListener('keydown', (e)=> { if(e.key === 'Enter') openWindow(icon.dataset.window); });
  });

  // Ventanas: controls y dragging
  document.querySelectorAll('.window').forEach(win=>{
    const closeBtn = win.querySelector('.close');
    if (closeBtn) closeBtn.addEventListener('click', ()=> closeWindow(win.id));
    const minBtn = win.querySelector('.minimize');
    if (minBtn) minBtn.addEventListener('click', ()=> {
      win.style.display = 'none';
      win.setAttribute('aria-hidden','true');
      win.dataset.minimized = 'true';
      const tbBtn = taskbar && taskbar.querySelector(`[data-win="${win.id}"]`);
      if (tbBtn) { tbBtn.classList.add('minimized'); tbBtn.classList.remove('focus'); }
    });

    win.addEventListener('pointerdown', ()=> { openWindow.topZ = (openWindow.topZ || 20) + 1; win.style.zIndex = openWindow.topZ; updateTaskbarFocus(win.id); });

    const title = win.querySelector('.titlebar');
    if (!title) return;
    let dragging = false;
    let offsetX=0, offsetY=0;

    const onPointerDown = (e) => {
      if (e.target && e.target.closest && e.target.closest('.controls')) return;
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

  // Taskbar: creación de botones
  function addTaskbarItem(id, win){
    if (!taskbar) return;
    let existing = taskbar.querySelector(`[data-win="${id}"]`);
    if (existing) {
      if (win.style.display !== 'none' && win.getAttribute('aria-hidden') !== 'true') existing.classList.remove('minimized');
      return;
    }
    const btn = document.createElement('button');
    btn.className = 'tb-item';
    btn.dataset.win = id;
    const iconSrc = win.dataset.icon || 'images/default-icon.png';
    const img = document.createElement('img'); img.src = iconSrc; img.alt = '';
    const span = document.createElement('span'); span.textContent = win.querySelector('.title').textContent;
    btn.appendChild(img); btn.appendChild(span);
    btn.addEventListener('click', ()=>{
      const isMinimized = win.style.display === 'none' || win.getAttribute('aria-hidden') === 'true';
      const isFocused = btn.classList.contains('focus');
      if (isMinimized || !isFocused) {
        win.style.display = 'block'; win.setAttribute('aria-hidden','false'); win.dataset.minimized = 'false';
        openWindow.topZ = (openWindow.topZ || 20) + 1; win.style.zIndex = openWindow.topZ; updateTaskbarFocus(id);
      } else {
        win.style.display = 'none'; win.setAttribute('aria-hidden','true'); win.dataset.minimized = 'true';
        btn.classList.add('minimized'); btn.classList.remove('focus');
      }
    });
    taskbar.appendChild(btn);
  }
  function removeTaskbarItem(id){ if (!taskbar) return; const el = taskbar.querySelector(`[data-win="${id}"]`); if(el) el.remove(); }

  // Clock
  function updateClock(){
    const d = new Date(); let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2,'0'); const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12; h = h ? h : 12; if (clock) clock.textContent = `${h}:${m} ${ampm}`;
  }
  setInterval(updateClock,1000); updateClock();

  // Drag de iconos + persistencia (actualiza posición en localStorage cuando mueves)
  (function(){
    const STORAGE_KEY = ICON_POS_KEY;
    const positions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

    // aplicar posiciones guardadas (ya fueron actualizadas por el layout fijo)
    icons.forEach(icon => {
      const id = icon.dataset.window || icon.getAttribute('id') || null;
      if (id && positions[id]) { icon.style.left = positions[id].x + 'px'; icon.style.top = positions[id].y + 'px'; }
      icon._wasMoved = false;
    });

    icons.forEach(icon => {
      let isPointerDown = false, startX = 0, startY = 0, iconStartLeft = 0, iconStartTop = 0;
      let moved = false, rafId = null; const MOVE_THRESHOLD = 6;

      const onPointerDown = (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        isPointerDown = true; moved = false; icon.classList.add('dragging'); icon.setPointerCapture && icon.setPointerCapture(e.pointerId);
        startX = e.clientX; startY = e.clientY;
        iconStartLeft = parseInt(getComputedStyle(icon).left, 10) || 0;
        iconStartTop = parseInt(getComputedStyle(icon).top, 10) || 0;
        icon.style.zIndex = (openWindow.topZ || 100) + 1; openWindow.topZ = parseInt(icon.style.zIndex, 10);
        e.preventDefault();
      };
      const onPointerMove = (e) => {
        if (!isPointerDown) return;
        const dx = e.clientX - startX, dy = e.clientY - startY;
        if (!moved && (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD)) moved = true;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          let nx = iconStartLeft + dx, ny = iconStartTop + dy;
          nx = Math.max(0, Math.min(nx, window.innerWidth - icon.offsetWidth));
          ny = Math.max(0, Math.min(ny, window.innerHeight - 40 - icon.offsetHeight));
          icon.style.left = nx + 'px'; icon.style.top = ny + 'px';
        });
      };
      const onPointerUp = (e) => {
        if (!isPointerDown) return;
        isPointerDown = false; icon.classList.remove('dragging'); icon.releasePointerCapture && icon.releasePointerCapture(e.pointerId);
        if (moved) {
          icon._wasMoved = true; setTimeout(()=>{ icon._wasMoved = false; }, 50);
          const id = icon.dataset.window || icon.getAttribute('id') || null;
          if (id) { positions[id] = { x: parseInt(icon.style.left), y: parseInt(icon.style.top) }; localStorage.setItem(STORAGE_KEY, JSON.stringify(positions)); }
        }
      };
      icon.addEventListener('pointerdown', onPointerDown);
      icon.addEventListener('pointermove', onPointerMove);
      icon.addEventListener('pointerup', onPointerUp);
    });
  })();

  // Carpetas dentro de Skills (dblclick + teclado)
  (function(){
    const folders = document.querySelectorAll('.folder');
    if (!folders || folders.length === 0) return;
    folders.forEach(folder => {
      folder._wasMoved = false;
      folder.addEventListener('dblclick', (e) => {
        if (folder._wasMoved) { e.stopImmediatePropagation(); return; }
        const id = folder.dataset.window; if (id && typeof openWindow === 'function') openWindow(id);
      });
      folder.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const id = folder.dataset.window; if (id && typeof openWindow === 'function') openWindow(id); }
      });
      folder.style.cursor = 'pointer';
    });
  })();

})();