import TelegramBot from 'node-telegram-bot-api';
import { config } from './config.js';
import { supabase } from './lib/db.js';

// polling: true significa que el bot se queda escuchando activamente
const bot = new TelegramBot(config.telegram.token, { polling: true });

console.log('🤖 Bot de Telegram escuchando comandos...');

bot.on('callback_query', async (query) => {
  const data = query.data;
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;

  // Extraemos el slug del trámite (ej: publish_beca-6000)
  const slug = data.split('_')[1];

  // 1. SI PULSAS PUBLICAR
  if (data.startsWith('publish_')) {
    const { error } = await supabase
      .from('tramites')
      .update({ publicado: true, actualizado_en: new Date().toISOString() })
      .eq('slug', slug);

    if (error) {
      return bot.answerCallbackQuery(query.id, { text: `Error: ${error.message}`, show_alert: true });
    }

    bot.editMessageText(`✅ *Publicado en la web:* ${slug}`, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown'
    });
    bot.answerCallbackQuery(query.id, { text: '¡Publicado con éxito!' });
  }

  // 2. SI PULSAS REVISAR
  else if (data.startsWith('review_')) {
    // Lo marcamos en base de datos para revisarlo luego por consola
    const { error } = await supabase
      .from('tramites')
      .update({ estado: 'Desconocido' }) // O el campo que uses para marcar pendientes
      .eq('slug', slug);

    if (error) {
      return bot.answerCallbackQuery(query.id, { text: `Error: ${error.message}`, show_alert: true });
    }

    bot.editMessageText(`🔍 *Marcado para revisión manual:* ${slug}\nEjecuta 'npm run reviewer' en tu terminal.`, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown'
    });
    bot.answerCallbackQuery(query.id, { text: 'Marcado para revisar' });
  }

  // 3. SI PULSAS IGNORAR
  else if (data.startsWith('ignore_')) {
    bot.editMessageText(`❌ *Ignorado:* ${slug}`, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown'
    });
    bot.answerCallbackQuery(query.id, { text: 'Ignorado' });
  }
});