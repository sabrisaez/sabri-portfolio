// config.js
const BASE_PATH = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? '' 
  : '/sabri-portfolio';

// Función helper para resolver rutas
function resolveImagePath(imagePath) {
  return BASE_PATH + imagePath;
}