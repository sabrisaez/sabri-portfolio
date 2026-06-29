// Basic interactions: double-click icon to open matching window, close button, draggable titlebar, record open windows in taskbar.
(function(){
  const icons = document.querySelectorAll('.icon');
  const windows = document.querySelectorAll('.window');
  const taskbar = document.getElementById('taskbar-windows');

  function openWindow(id){
    const win = document.getElementById(id);
    if(!win) return;
    win.style.display = 'block';
    win.style.zIndex = ++openWindow.topZ;
    win.setAttribute('aria-hidden','false');
    addTaskbarItem(id, win);
  }
  openWindow.topZ = 20;

  function closeWindow(id){
    const win = document.getElementById(id);
    if(!win) return;
    win.style.display = 'none';
    win.setAttribute('aria-hidden','true');
    removeTaskbarItem(id);
  }

  // double click or Enter key open
  icons.forEach(icon=>{
    icon.addEventListener('dblclick', ()=> openWindow(icon.dataset.window));
    icon.addEventListener('keydown', (e)=> { if(e.key === 'Enter') openWindow(icon.dataset.window); });
  });

  // controls
  document.querySelectorAll('.window').forEach(win=>{
    const closeBtn = win.querySelector('.close');
    closeBtn.addEventListener('click', ()=> closeWindow(win.id));
    const minBtn = win.querySelector('.minimize');
    minBtn.addEventListener('click', ()=> { win.style.display='none'; removeTaskbarItem(win.id); win.setAttribute('aria-hidden','true'); });

    // clicking window brings to front
    win.addEventListener('mousedown', ()=> { win.style.zIndex = ++openWindow.topZ; });

    // dragging
    const title = win.querySelector('.titlebar');
    let dragging = false, offsetX=0, offsetY=0;
    title.addEventListener('mousedown', (e)=>{
      dragging = true;
      win.style.zIndex = ++openWindow.topZ;
      offsetX = e.clientX - win.offsetLeft;
      offsetY = e.clientY - win.offsetTop;
      document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', (e)=>{
      if(!dragging) return;
      let nx = e.clientX - offsetX;
      let ny = e.clientY - offsetY;
      // keep inside viewport
      nx = Math.max(8, Math.min(nx, window.innerWidth - win.clientWidth - 8));
      ny = Math.max(8, Math.min(ny, window.innerHeight - win.clientHeight - 44)); // leave space for taskbar
      win.style.left = nx + 'px';
      win.style.top = ny + 'px';
    });
    document.addEventListener('mouseup', ()=>{ dragging = false; document.body.style.userSelect = ''; });
  });

  // taskbar items: one per open window
  function addTaskbarItem(id, win){
    if(taskbar.querySelector(`[data-win="${id}"]`)) return;
    const btn = document.createElement('button');
    btn.className = 'tb-item';
    btn.textContent = win.querySelector('.title').textContent;
    btn.dataset.win = id;
    btn.addEventListener('click', ()=>{
      // toggle minimize/restore
      if(win.style.display === 'none' || win.getAttribute('aria-hidden') === 'true'){
        win.style.display = 'block';
        win.setAttribute('aria-hidden','false');
        win.style.zIndex = ++openWindow.topZ;
      } else {
        win.style.display = 'none';
        win.setAttribute('aria-hidden','true');
      }
    });
    taskbar.appendChild(btn);
  }
  function removeTaskbarItem(id){
    const el = taskbar.querySelector(`[data-win="${id}"]`);
    if(el) el.remove();
  }

  // simple clock
  const clock = document.getElementById('clock');
  function updateClock(){
    const d = new Date();
    const h = String(d.getHours()).padStart(2,'0');
    const m = String(d.getMinutes()).padStart(2,'0');
    clock.textContent = `${h}:${m}`;
  }
  setInterval(updateClock,1000);
  updateClock();

  // Accessibility: allow Enter on icons, and open first window for quick preview
  // (optional) Open Resume on first load for demo:
  // openWindow('win-resume');
})();