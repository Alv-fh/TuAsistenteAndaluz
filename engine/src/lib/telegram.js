import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config.js';

// polling: false porque este script solo envía alertas, no recibe comandos
const bot = new TelegramBot(config.telegram.token, { polling: false });

export async function sendAlert(tramite, accion, esCambio = false) {
  const emoji = esCambio ? '🔄' : '🆕';
  const tituloAccion = esCambio ? 'TRÁMITE MODIFICADO' : 'NUEVO TRÁMITE DETECTADO';

  const mensaje = `
${emoji} *${tituloAccion}* ${emoji}

*Título:* ${tramite.titulo}
*Categoría:* ${tramite.categoria}
*Estado:* ${tramite.estado}
*Acción:* ${accion}

[🔗 Ver enlace oficial](${tramite.url_oficial})
  `;

  const opciones = {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Publicar ahora', callback_data: `publish_${tramite.slug}` },
          { text: '🔍 Marcar para revisar', callback_data: `review_${tramite.slug}` }
        ],
        [
          { text: '❌ Ignorar', callback_data: `ignore_${tramite.slug}` }
        ]
      ]
    }
  };

  try {
    await bot.sendMessage(config.telegram.adminChatId, mensaje, opciones);
    console.log(`📲 Alerta enviada a Telegram para: ${tramite.slug}`);
  } catch (error) {
    console.error('Error enviando mensaje a Telegram:', error.message);
  }
}