import { sendAlert } from './lib/telegram.js';

const tramiteFalso = {
  slug: 'simulacion-crawler-001', // <-- El mismo slug del SQL
  titulo: 'Ayuda de Simulación para probar el Bot', // <-- El mismo título
  categoria: 'Ayudas',
  estado: 'Abierto',
  url_oficial: 'https://www.juntadeandalucia.es/'
};

console.log('Enviando alerta de prueba a Telegram...');

sendAlert(tramiteFalso, 'Test de conexión', false)
  .then(() => console.log('¡Mensaje enviado! Mira tu móvil.'));