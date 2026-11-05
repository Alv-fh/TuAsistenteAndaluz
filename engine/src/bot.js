import TelegramBot from 'node-telegram-bot-api';
import { config } from './config.js';
import { supabase } from './lib/db.js';

// polling: true significa que el bot se queda escuchando activamente
const bot = new TelegramBot(config.telegram.token, { polling: true });

// 👇 PEGA AQUÍ TU URL DEL DEPLOY HOOK DE VERCEL 👇
// (La encuentras en Vercel -> Settings -> Git -> Deploy Hooks)
const VERCEL_DEPLOY_HOOK = 'https://api.vercel.com/v1/integrations/deploy/prj_x2LksfD37q2oI5l0IAHJ2TJ5zvrt/HjGVumAP5l';

console.log('🤖 Bot de Telegram escuchando comandos...');

bot.on('callback_query', async (query) => {
  const data = query.data;
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;

  // Extraemos el slug del trámite (ej: publish_beca-6000)
  const slug = data.split('_')[1];

  // 1. SI PULSAS PUBLICAR
  if (data.startsWith('publish_')) {
    
    // Le decimos a Telegram que estamos procesando
    bot.answerCallbackQuery(query.id, { text: 'Publicando y desplegando...' });

    // A) Actualizamos Supabase
    const { error } = await supabase
      .from('tramites')
      .update({ publicado: true, actualizado_en: new Date().toISOString() })
      .eq('slug', slug);

    if (error) {
      return bot.answerCallbackQuery(query.id, { text: `Error: ${error.message}`, show_alert: true });
    }

    // B) Avisamos a Vercel para que regenere la web (ejecutando el script)
    try {
      await fetch(VERCEL_DEPLOY_HOOK, { method: 'POST' });
      console.log(`🚀 Despliegue de Vercel solicitado para: ${slug}`);
    } catch (e) {
      console.error('Error al llamar al Deploy Hook de Vercel:', e.message);
    }

    // C) Actualizamos el mensaje en Telegram
    bot.editMessageText(`✅ *Publicado y desplegando:* ${slug}\nEspera 30 segundos a que Vercel actualice la web.`, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown'
    });
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