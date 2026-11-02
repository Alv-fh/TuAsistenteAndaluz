import { sendAlert } from './lib/telegram.js';

const tramiteFalso = {
  slug: 'prueba-bot-123',
  titulo: 'Beca de Prueba para validar el Bot',
  categoria: 'Educación',
  estado: 'Abierto',
  url_oficial: 'https://www.juntadeandalucia.es/'
};

console.log('Enviando alerta de prueba a Telegram...');

sendAlert(tramiteFalso, 'Test de conexión', false)
  .then(() => console.log('¡Mensaje enviado! Mira tu móvil.'))
  .catch((err) => console.error('Error:', err.message));