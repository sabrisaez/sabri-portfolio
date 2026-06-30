// script.js — icons layout, windows (move/resize), taskbar and persistence
(function(){
  const ICON_POS_KEY = 'desktop_icon_positions_v1';
  const icons = document.querySelectorAll('.icon');
  const windows = document.querySelectorAll('.window');
  const taskbar = document.getElementById('taskbar-windows');
  const clock = document.getElementById('clock');

  // ---------- Helper: read/write storage ----------
  function readStorage(){
    try { return JSON.parse(localStorage.getItem(ICON_POS_KEY) || '{}'); }
    catch(e){ return {}; }
  }
  function writeStorage(obj){
    try { localStorage.setItem(ICON_POS_KEY, JSON.stringify(obj || {})); }
    catch(e){ /* ignore */ }
  }

  // ---------- 1) fixed icon layout (left column) ----------
  (function applyFixedLeftColumnAndPersist(){
    const spacingY = 84;
    const startLeft = 20;
    const startTop = 20;
    const order = [
      'win-about',
      'win-projects',
      'win-skills',
      'win-contact',
      'win-system',
      'win-resume'
    ];

    const positions = readStorage();

    order.forEach((id, idx) => {
      let icon = document.querySelector(`.icon[data-window="${id}"]`);
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
        positions[id] = { x: left, y: top };
      }
    });

    writeStorage(positions);
    console.log('Icon layout applied and saved.');
  })();

  // ---------- Utility: taskbar focus ----------
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

  // ---------- Helper: center a window in the viewport ----------
  function centerWindow(win){
    // attempt to get current width/height (style or computed)
    let w = parseInt(win.style.width, 10);
    let h = parseInt(win.style.height, 10);
    if (!w || isNaN(w)) w = Math.round(win.getBoundingClientRect().width) || 420;
    if (!h || isNaN(h)) h = Math.round(win.getBoundingClientRect().height) || 300;
    const left = Math.max(8, Math.round((window.innerWidth - w) / 2));
    const top = Math.max(8, Math.round((window.innerHeight - h) / 2) - 20); // slight visual up
    win.style.left = left + 'px';
    win.style.top = top + 'px';
  }

  // ---------- Open/Close windows (center on open and guard against immediate drag) ----------
  const openWindow = function(id){
    const win = document.getElementById(id);
    if (!win) return;

    // center the window when opening (user requested "center on open")
    centerWindow(win);

    // mark just opened to prevent immediate accidental drag
    win._justOpened = true;
    setTimeout(()=> { win._justOpened = false; }, 200);

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

  // ---------- Attach icon open handlers ----------
  icons.forEach(icon=>{
    icon.addEventListener('dblclick', (e)=> {
      if (icon._wasMoved) { e.stopImmediatePropagation(); return; }
      openWindow(icon.dataset.window);
    });
    icon.addEventListener('keydown', (e)=> { if(e.key === 'Enter') openWindow(icon.dataset.window); });
  });

  // ---------- Persist window size/pos ----------
  function persistWindowState(win){
    try {
      const stored = readStorage();
      const id = win.id;
      if (!id) return;
      const left = Math.round(parseFloat(win.style.left || win.getBoundingClientRect().left) || 0);
      const top = Math.round(parseFloat(win.style.top || win.getBoundingClientRect().top) || 0);
      const width = Math.round(parseFloat(win.style.width || win.getBoundingClientRect().width) || 0);
      const height = Math.round(parseFloat(win.style.height || win.getBoundingClientRect().height) || 0);
      stored[id] = { x: left, y: top };
      stored[id + '_size'] = { w: width, h: height };
      writeStorage(stored);
    } catch(e){}
  }

  // ---------- Apply saved windows sizes / positions on load (but we will still center on open) ----------
  (function applySavedWindowStates(){
    const stored = readStorage();
    windows.forEach(win => {
      try {
        const pos = stored[win.id];
        if (pos && typeof pos.x === 'number') win.style.left = pos.x + 'px';
        if (pos && typeof pos.y === 'number') win.style.top = pos.y + 'px';
        const size = stored[win.id + '_size'];
        if (size && typeof size.w === 'number') win.style.width = size.w + 'px';
        if (size && typeof size.h === 'number') win.style.height = size.h + 'px';
      } catch(e){}
    });
  })();

  // ---------- Window controls, drag and resize ----------
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

    // ensure resizer exists
    if (!win.querySelector('.resizer')) {
      const r = document.createElement('div');
      r.className = 'resizer';
      win.appendChild(r);
    }

    // bring to front on pointerdown
    win.addEventListener('pointerdown', ()=> { openWindow.topZ = (openWindow.topZ || 20) + 1; win.style.zIndex = openWindow.topZ; updateTaskbarFocus(win.id); });

    // dragging via titlebar
    const title = win.querySelector('.titlebar');
    if (title) {
      let dragging = false;
      let offsetX=0, offsetY=0;

      const onPointerDown = (e) => {
        // ignore immediate pointerdown right after opening
        if (win._justOpened) { e.preventDefault(); return; }
        if (e.target && e.target.closest && e.target.closest('.controls')) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        dragging = true;
        openWindow.topZ = (openWindow.topZ || 20) + 1;
        win.style.zIndex = openWindow.topZ;
        offsetX = e.clientX - (parseFloat(win.style.left) || win.getBoundingClientRect().left);
        offsetY = e.clientY - (parseFloat(win.style.top) || win.getBoundingClientRect().top);
        title.setPointerCapture && title.setPointerCapture(e.pointerId);
        document.body.style.userSelect = 'none';
        updateTaskbarFocus(win.id);
      };
      const onPointerMove = (e) => {
        if(!dragging) return;
        let nx = e.clientX - offsetX;
        let ny = e.clientY - offsetY;
        nx = Math.max(8, Math.min(nx, window.innerWidth - (win.getBoundingClientRect().width) - 8));
        ny = Math.max(8, Math.min(ny, window.innerHeight - (win.getBoundingClientRect().height) - 44));
        win.style.left = Math.round(nx) + 'px';
        win.style.top = Math.round(ny) + 'px';
      };
      const onPointerUp = (e) => {
        if(!dragging) return;
        dragging = false;
        title.releasePointerCapture && title.releasePointerCapture(e.pointerId);
        document.body.style.userSelect = '';
        persistWindowState(win);
      };
      title.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    }

    // resizing via resizer (bottom-right)
    const resizer = win.querySelector('.resizer');
    if (resizer) {
      let resizing = false;
      let startX = 0, startY = 0, startW = 0, startH = 0;
      const minW = 260;
      const minH = 140;

      const onResizePointerDown = (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        resizing = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = win.getBoundingClientRect();
        startW = rect.width;
        startH = rect.height;
        resizer.setPointerCapture && resizer.setPointerCapture(e.pointerId);
        document.body.style.userSelect = 'none';
        win.classList.add('resizing');
        e.preventDefault();
      };

      const onResizePointerMove = (e) => {
        if (!resizing) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let newW = Math.max(minW, Math.round(startW + dx));
        let newH = Math.max(minH, Math.round(startH + dy));
        const winLeft = parseInt(win.style.left || win.getBoundingClientRect().left, 10) || 0;
        const winTop = parseInt(win.style.top || win.getBoundingClientRect().top, 10) || 0;
        newW = Math.min(newW, Math.max(200, window.innerWidth - winLeft - 8));
        newH = Math.min(newH, Math.max(120, window.innerHeight - winTop - 44));
        win.style.width = newW + 'px';
        win.style.height = newH + 'px';
      };

      const onResizePointerUp = (e) => {
        if (!resizing) return;
        resizing = false;
        resizer.releasePointerCapture && resizer.releasePointerCapture(e.pointerId);
        document.body.style.userSelect = '';
        win.classList.remove('resizing');
        persistWindowState(win);
      };

      resizer.addEventListener('pointerdown', onResizePointerDown);
      window.addEventListener('pointermove', onResizePointerMove);
      window.addEventListener('pointerup', onResizePointerUp);
    }
  });

  // ---------- Taskbar items (ensure restore goes through openWindow so it centers) ----------
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

    const iconSrc = (win && win.dataset && win.dataset.icon) ? win.dataset.icon : 'images/default-icon.png';
    const img = document.createElement('img'); img.src = iconSrc; img.alt = '';
    const span = document.createElement('span'); span.textContent = (win && win.querySelector('.title')) ? win.querySelector('.title').textContent : id;
    btn.appendChild(img); btn.appendChild(span);

    btn.addEventListener('click', ()=>{
      const isMinimized = win.style.display === 'none' || win.getAttribute('aria-hidden') === 'true';
      const isFocused = btn.classList.contains('focus');
      if (isMinimized || !isFocused) {
        // use openWindow to ensure centering behavior
        openWindow(id);
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
    if (!taskbar) return;
    const el = taskbar.querySelector(`[data-win="${id}"]`);
    if(el) el.remove();
  }

  // ---------- Clock ----------
  function updateClock(){
    const d = new Date(); let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2,'0'); const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12; h = h ? h : 12; if (clock) clock.textContent = `${h}:${m} ${ampm}`;
  }
  setInterval(updateClock,1000);
  updateClock();

  // ---------- Icons dragging & persistence ----------
  (function(){
    const positions = readStorage();

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
        if (!moved && (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD)) moved = true;
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
            const stored = readStorage();
            stored[id] = { x: parseInt(icon.style.left), y: parseInt(icon.style.top) };
            writeStorage(stored);
          }
        }
      };

      icon.addEventListener('pointerdown', onPointerDown);
      icon.addEventListener('pointermove', onPointerMove);
      icon.addEventListener('pointerup', onPointerUp);
    });
  })();

  // ---------- Folders in Skills: dblclick + keyboard ----------
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