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

// Textos aceptados para el botón de cookies (el texto completo del botón debe coincidir)
const BOTON_ACEPTAR_COOKIES = /^\s*(aceptar(\s+todas)?(\s+las)?(\s+cookies)?|aceptar\s+y\s+cerrar|acepto|ok)\s*$/i;

// Intenta cerrar el banner de cookies. Nunca lanza error: si no hay banner o falla, el flujo sigue igual.
async function aceptarCookies(pagina, url) {
  try {
    // Margen para que el banner aparezca
    await pagina.waitForTimeout(1500);

    const boton = pagina
      .locator('button:visible, [role="button"]:visible, a:visible')
      .filter({ hasText: BOTON_ACEPTAR_COOKIES })
      .first();

    if ((await boton.count()) === 0) {
      console.log(`   🍪 Sin banner de cookies en ${url}`);
      return false;
    }

    await boton.click({ timeout: 3000 });
    // Tiempo para que cargue el contenido dinámico tras aceptar
    await pagina.waitForTimeout(1000);
    console.log(`   🍪 Cookies aceptadas en ${url}`);
    return true;
  } catch (e) {
    console.log(`   🍪 Aviso: no se pudo aceptar cookies en ${url} (${e.message.split('\n')[0]})`);
    return false;
  }
}

export async function leerPagina(pagina, url) {
  await irA(pagina, url);
  await aceptarCookies(pagina, url);
  await pagina.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await pagina.waitForTimeout(3000);
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
