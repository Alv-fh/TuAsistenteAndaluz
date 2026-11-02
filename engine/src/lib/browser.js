import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import { config } from '../config.js';
import { espera, huellaTexto } from './db.js';

chromium.use(stealthPlugin());

export async function abrirNavegador(forzarOculto = false) {
  const navegador = await chromium.launch({
    headless: forzarOculto || config.crawler.headless,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-dev-shm-usage']
  });
  const contexto = await navegador.newContext({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    viewport: { width: 1366, height: 768 }
  });
  const pagina = await contexto.newPage();
  return { navegador, pagina };
}

async function irA(pagina, url, intentos = 2) {
  for (let i = 1; i <= intentos; i++) {
    try {
      return await pagina.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    } catch (e) {
      console.log(`   Intento ${i}/${intentos} fallido: ${e.message.split('\n')[0]}`);
      if (i === intentos) throw e;
      await espera(3000 * i);
    }
  }
}

export async function leerPagina(pagina, url) {
  await irA(pagina, url);
  await pagina.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

  return pagina.evaluate(() => {
    const selectores = ['#main-content', 'main', '[role="main"]', 'article', '#content', '.content'];
    let contenedor = null;
    let usado = 'body';
    for (const s of selectores) {
      const el = document.querySelector(s);
      if (el && el.innerText.trim().length > 80) {
        contenedor = el;
        usado = s;
        break;
      }
    }
    if (!contenedor) contenedor = document.body;

    const enlaces = [...contenedor.querySelectorAll('a[href]')]
      .filter((a) => !a.closest('nav, header, footer'))
      .map((a) => ({ texto: (a.innerText || a.title || '').trim(), href: a.href }));

    document.querySelectorAll('nav, header, footer, script, style').forEach((el) => el.remove());
    const texto = contenedor.innerText.replace(/\s+/g, ' ').trim();
    return { texto, enlaces, usado };
  });
}

export async function leerFuentes(pagina, urls) {
  const partes = [];
  let texto = '';
  for (const u of urls) {
    try {
      const r = await leerPagina(pagina, u);
      console.log(`   Fuente leída (${r.texto.length} caracteres, contenedor: ${r.usado}): ${u}`);
      partes.push(r.texto);
      texto += `\n--- FUENTE: ${u} ---\n${r.texto.substring(0, config.crawler.maxCaracteresFuente)}`;
    } catch (e) {
      console.log(`   No se pudo leer ${u}: ${e.message.split('\n')[0]}`);
    }
    await espera(2000);
  }
  return {
    texto,
    huella: huellaTexto(partes.join('|')),
    completa: urls.length > 0 && partes.length === urls.length
  };
}