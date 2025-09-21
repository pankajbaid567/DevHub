// Test URL construction
const VITE_BACKEND_URL = 'https://devhub-production-ed42.up.railway.app';

// Test the URL construction logic
const API_BASE_URL = VITE_BACKEND_URL 
  ? `${VITE_BACKEND_URL.replace(/\/$/, '')}/api` 
  : 'http://localhost:3000/api';

console.log('VITE_BACKEND_URL:', VITE_BACKEND_URL);
console.log('API_BASE_URL:', API_BASE_URL);
console.log('Test endpoint:', `${API_BASE_URL}/auth/login`);

// Test with trailing slash
const VITE_BACKEND_URL_WITH_SLASH = 'https://devhub-production-ed42.up.railway.app/';
const API_BASE_URL_WITH_SLASH = VITE_BACKEND_URL_WITH_SLASH 
  ? `${VITE_BACKEND_URL_WITH_SLASH.replace(/\/$/, '')}/api` 
  : 'http://localhost:3000/api';

console.log('\nWith trailing slash:');
console.log('VITE_BACKEND_URL_WITH_SLASH:', VITE_BACKEND_URL_WITH_SLASH);
console.log('API_BASE_URL_WITH_SLASH:', API_BASE_URL_WITH_SLASH);
console.log('Test endpoint:', `${API_BASE_URL_WITH_SLASH}/auth/login`);
