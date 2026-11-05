import TelegramBot from 'node-telegram-bot-api';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { config } from './config.js';
import { supabase } from './lib/db.js';

const execFileAsync = promisify(execFile);

// La misma ruta que usas tú a mano
const SCRIPT = 'TuAsistenteAndaluz/scripts/generar-paginas.mjs';
const RAIZ = 'TuAsistenteAndaluz';

// polling: true significa que el bot se queda escuchando activamente
const bot = new TelegramBot(config.telegram.token, { polling: true });

console.log('🤖 Bot de Telegram escuchando comandos...');

bot.on('callback_query', async (query) => {
  console.log('🔔 callback_query recibido:', query.data); 
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

    // Ejecutamos el script, igual que lo haces tú a mano
    try {
      const { stdout, stderr } = await execFileAsync(process.execPath, [SCRIPT], {
        cwd: RAIZ,
        env: process.env,
      });
      console.log(stdout);
      if (stderr) console.warn(stderr);
    } catch (e) {
      console.error('Error ejecutando generar-paginas.mjs:', e.message);
      return bot.answerCallbackQuery(query.id, {
        text: `Error generando páginas: ${e.message}`,
        show_alert: true,
      });
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
    const { error } = await supabase
      .from('tramites')
      .update({ estado: 'Desconocido' })
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