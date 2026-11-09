import TelegramBot from 'node-telegram-bot-api';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { config } from './config.js';
import { supabase } from './lib/db.js';

const execFileAsync = promisify(execFile);

// Rutas absolutas
const SCRIPT = '/var/www/TuAsistenteAndaluz/scripts/generar-paginas.mjs';
const RAIZ = '/var/www/TuAsistenteAndaluz';
const REPO_URL = 'github.com/Alv-fh/TuAsistenteAndaluz.git';
const RAMA = 'main'; // Cambia a 'master' si tu rama principal se llama así

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
    bot.answerCallbackQuery(query.id, { text: 'Publicando y desplegando...' });

    // A.1) Comprobamos que la guía esté generada antes de publicar
    const { data: tramite, error: errorLectura } = await supabase
      .from('tramites')
      .select('guia, guia_html')
      .eq('slug', slug)
      .single();

    if (errorLectura || !tramite) {
      return bot.answerCallbackQuery(query.id, {
        text: `Error en BD: ${errorLectura?.message ?? 'trámite no encontrado'}`,
        show_alert: true,
      });
    }

    const tieneGuia = Boolean(tramite.guia) && typeof tramite.guia === 'object' && Object.keys(tramite.guia).length > 0;
    const tieneHtml = typeof tramite.guia_html === 'string' && tramite.guia_html.trim().length > 0;

    if (!tieneGuia || !tieneHtml) {
      await bot.editMessageText(
        '⚠️ Error: No puedo publicar. La guía aún no ha sido generada por la IA o está incompleta. Vuelve a intentarlo cuando el crawler haya terminado.',
        { chat_id: chatId, message_id: messageId }
      );
      return bot.answerCallbackQuery(query.id, {
        text: 'La guía no está lista. No se ha publicado.',
        show_alert: true,
      });
    }

    // A.2) Actualizamos Supabase
    const { error } = await supabase
      .from('tramites')
      .update({ publicado: true, actualizado_en: new Date().toISOString() })
      .eq('slug', slug);

    if (error) {
      return bot.answerCallbackQuery(query.id, { text: `Error en BD: ${error.message}`, show_alert: true });
    }

    // B) Ejecutamos el script para generar las páginas
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

    // C) Hacemos commit y push a GitHub
    try {
      // 1. Comprobar si hay cambios (git status --porcelain)
      const { stdout: statusOut } = await execFileAsync('git', ['status', '--porcelain', 'public/'], { cwd: RAIZ });
      
      if (statusOut.trim().length > 0) {
        // Hay cambios, procedemos a subirlos
        await execFileAsync('git', ['add', 'public/'], { cwd: RAIZ });
        await execFileAsync('git', ['commit', '-m', `Publicar trámite: ${slug}`], { cwd: RAIZ });
        
        // Usamos el token del .env para el push
        const token = process.env.GITHUB_TOKEN;
        if (!token) throw new Error('Falta GITHUB_TOKEN en el archivo .env');
        
        const pushUrl = `https://${token}@${REPO_URL}`;
        await execFileAsync('git', ['push', pushUrl, RAMA], { cwd: RAIZ });
        
        console.log(`🚀 Push a GitHub completado para: ${slug}`);
      } else {
        console.log('No hay cambios nuevos en public/ para subir.');
      }
    } catch (e) {
      console.error('Error en Git:', e.message);
      // Si falla Git, avisamos en Telegram pero la BD ya está actualizada.
      bot.answerCallbackQuery(query.id, { 
        text: `Publicado en BD, pero falló Git: ${e.message}`, 
        show_alert: true 
      });
    }

    // D) Actualizamos el mensaje en Telegram
    bot.editMessageText(`✅ *Publicado y subido a la web:* ${slug}`, {
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
