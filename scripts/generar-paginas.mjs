#!/usr/bin/env node
/**
 * Generador de páginas estáticas para TuAsistenteAndaluz (SEO).
 *
 * Lee los trámites publicados de Supabase y escribe en /public:
 *   - /ayuda/<slug>/index.html        una página por ficha (contenido completo en el HTML)
 *   - /categoria/<cat>/index.html     una página por categoría
 *   - /sitemap.xml                    con <lastmod> real (sustituye al que tengas)
 *   - bloque de enlaces en /index.html, entre los marcadores <!-- TAA:ENLACES --> ... <!-- /TAA:ENLACES -->
 *
 * Uso:
 *   node scripts/generar-paginas.mjs                 (lee de Supabase)
 *   node scripts/generar-paginas.mjs --datos x.json  (lee de un JSON local, para probar sin red)
 *
 * Variables de entorno (todas opcionales):
 *   SUPABASE_URL, SUPABASE_ANON_KEY   si faltan, se leen de public/app.js (son las mismas públicas)
 *   SITE_URL                          por defecto https://tuasistenteandaluz.es
 *
 * IMPORTANTE: usa solo la clave ANON (pública). Nunca la service key.
 * No necesita dependencias: solo Node 18 o superior.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(RAIZ, 'public');
const SITIO = (process.env.SITE_URL || 'https://tuasistenteandaluz.es').replace(/\/+$/, '');
const NOMBRE = 'TuAsistenteAndaluz';
// Páginas legales escritas a mano en public/legal/<slug>/index.html (el generador no las crea ni las borra)
const PAGINAS_LEGALES = ['aviso-legal', 'privacidad', 'cookies', 'quienes-somos'];
const DOMINIOS_OFICIALES = ['juntadeandalucia.es', 'boe.es', 'sepe.es', 'sepe.gob.es', 'seg-social.es', 'prestaciones.seg-social.es', 'sede.agenciatributaria.gob.es', 'sede.mscbs.gob.es'];

const COLUMNAS = [
  'id', 'created_at', 'slug', 'titulo', 'categoria', 'estado', 'cuantia',
  'fecha_apertura', 'fecha_cierre', 'proxima_apertura', 'apertura_estimada',
  'destacado', 'url_oficial', 'guia', 'guia_html', 'fuentes_extra', 'actualizado_en', 'revisado_en'
].join(',');

const ORDEN_CATEGORIAS = ['educacion', 'empleo', 'vivienda', 'ayudas', 'tramites'];
const INFO_CATEGORIAS = {
  educacion: {
    h1: 'Becas y ayudas de educación en Andalucía',
    intro: 'Becas, ayudas al transporte, comedor escolar y otras ayudas para estudiar en Andalucía, explicadas paso a paso y con enlace a la web oficial.'
  },
  empleo: {
    h1: 'Empleo y desempleo en Andalucía: ayudas y trámites',
    intro: 'Programas de empleo de la Junta de Andalucía y trámites del SEPE, como la prestación por desempleo, explicados en lenguaje sencillo.'
  },
  vivienda: {
    h1: 'Ayudas de vivienda en Andalucía',
    intro: 'Bonos de alquiler, avales y otras ayudas para acceder a una vivienda en Andalucía, con los requisitos y los pasos para solicitarlas.'
  },
  ayudas: {
    h1: 'Ayudas sociales en Andalucía',
    intro: 'Ayudas económicas y sociales de la Junta de Andalucía para familias, personas mayores y personas con discapacidad.'
  },
  tramites: {
    h1: 'Trámites oficiales en Andalucía',
    intro: 'Gestiones y trámites oficiales (tarjeta sanitaria, certificados, licencias, citas previas…) explicados paso a paso.'
  }
};

const CLASE_ESTADO = { 'Abierto': 'abierto', 'Próximamente': 'proximo', 'Cerrado': 'cerrado', 'Desconocido': 'desconocido' };
const ORDEN_ESTADO = { 'Abierto': 0, 'Próximamente': 1, 'Cerrado': 2, 'Desconocido': 3 };

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// JSON para <script type="application/ld+json">: evita que un "<" cierre la etiqueta
const jsonSeguro = (obj) =>
  JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

const quitarTildes = (t) => String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const slugDe = (t) => quitarTildes(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const SLUG_VALIDO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function recortar(texto, max) {
  const t = String(texto ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const corte = t.slice(0, max);
  const punto = corte.lastIndexOf('. ');
  if (punto > max * 0.6) return corte.slice(0, punto + 1);
  return corte.slice(0, corte.lastIndexOf(' ')).replace(/[,;:\s]+$/, '') + '…';
}

function enlaceSeguro(texto) {
  try {
    const u = new URL(texto);
    const ok = DOMINIOS_OFICIALES.some((d) => u.hostname === d || u.hostname.endsWith('.' + d));
    return u.protocol === 'https:' && ok ? u.href : null;
  } catch {
    return null;
  }
}

function motivoEnlaceNoValido(texto) {
  if (!texto) return 'url_oficial vacía';
  try {
    const u = new URL(texto);
    if (u.protocol !== 'https:') return `no es https (${u.protocol})`;
    return `dominio no permitido: ${u.hostname}`;
  } catch {
    return `no es una URL: "${String(texto).slice(0, 60)}"`;
  }
}

function fechaISO(ts) {
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}
function fechaLarga(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });
}

async function existe(ruta) {
  try { await fs.access(ruta); return true; } catch { return false; }
}

async function escribir(relativa, contenido) {
  const destino = path.join(PUBLIC, relativa);
  await fs.mkdir(path.dirname(destino), { recursive: true });
  await fs.writeFile(destino, contenido, 'utf8');
}

// ---------------------------------------------------------------------------
// Estado de la convocatoria (misma lógica que public/app.js)
// OJO: esta función se inyecta tal cual en las páginas con .toString(), así que
// debe ser AUTÓNOMA (no puede usar nada de fuera de ella).
// ---------------------------------------------------------------------------
function calcularEstado(t, ahora) {
  const pf = (s) => {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s ?? ''));
    if (!m) return null;
    const f = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    return Number.isNaN(f.getTime()) ? null : f;
  };
  const hayFecha = (f) => Boolean(f) && f !== 'No especificada';
  const h = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const ap = pf(t.fecha_apertura);
  const ci = pf(t.fecha_cierre);
  const hayProxima = Boolean(t.proxima_apertura);
  let estado = t.estado;
  let apertura = ap;

  if (estado === 'Abierto' && ci && ci < h) estado = 'Cerrado';
  if (estado === 'Próximamente' && ap && ap <= h && ci && ci >= h) estado = 'Abierto';
  if (estado === 'Cerrado' && hayProxima) estado = 'Próximamente';
  if (estado === 'Próximamente' && !hayProxima && ci && ci < h) estado = 'Cerrado';
  if (estado === 'Próximamente' && apertura && apertura <= h) apertura = null;
  if (estado === 'Próximamente' && !apertura && !hayProxima) estado = 'Desconocido';

  let etiqueta;
  if (estado === 'Abierto') {
    etiqueta = hayFecha(t.fecha_cierre) ? 'Abierto hasta el ' + t.fecha_cierre : 'Plazo abierto';
  } else if (estado === 'Próximamente') {
    if (apertura) etiqueta = 'Abre el ' + t.fecha_apertura;
    else if (t.proxima_apertura) etiqueta = t.apertura_estimada ? t.proxima_apertura + ' (sin confirmar)' : t.proxima_apertura;
    else etiqueta = 'Próximamente';
  } else if (estado === 'Cerrado') {
    etiqueta = hayFecha(t.fecha_cierre) ? 'Cerró el ' + t.fecha_cierre : 'Plazo cerrado';
  } else {
    etiqueta = 'Consulta el plazo en la web oficial';
  }
  return { estado, etiqueta };
}

// ---------------------------------------------------------------------------
// Carga de datos
// ---------------------------------------------------------------------------
async function credenciales() {
  let url = process.env.SUPABASE_URL;
  let key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    const app = await fs.readFile(path.join(PUBLIC, 'app.js'), 'utf8');
    url ||= app.match(/SUPABASE_URL\s*=\s*'([^']+)'/)?.[1];
    key ||= app.match(/SUPABASE_ANON_KEY\s*=\s*'([^']+)'/)?.[1];
  }
  if (!url || !key) throw new Error('No encuentro SUPABASE_URL / SUPABASE_ANON_KEY (ni en el entorno ni en public/app.js).');
  return { url: url.replace(/\/+$/, ''), key };
}

async function cargarTramites() {
  const i = process.argv.indexOf('--datos');
  if (i !== -1 && process.argv[i + 1]) {
    console.log(`Leyendo datos de ${process.argv[i + 1]} (modo prueba)`);
    return JSON.parse(await fs.readFile(process.argv[i + 1], 'utf8'));
  }
  const { url, key } = await credenciales();
  const q = new URLSearchParams({
    select: COLUMNAS,
    publicado: 'eq.true',
    order: 'id.asc',
    limit: '1000'
  });
  const r = await fetch(`${url}/rest/v1/tramites?${q}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  if (!r.ok) throw new Error(`Supabase respondió ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

// Frases que a veces vienen en los datos de origen y no queremos mostrar en las páginas
const FRASES_A_QUITAR = [
  /El texto de la página solo enumera las gestiones[^.\n]*\.?[ \t]*/gi
];

// Quita esas frases de cualquier texto (también dentro de listas y objetos anidados)
function limpiarFrases(valor) {
  if (typeof valor === 'string') {
    return FRASES_A_QUITAR.reduce((texto, re) => texto.replace(re, ''), valor).trim();
  }
  if (Array.isArray(valor)) {
    return valor.map(limpiarFrases).filter((v) => v !== '');
  }
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, limpiarFrases(v)]));
  }
  return valor;
}

function normalizarRegistro(r) {
  let guia = r.guia;
  if (typeof guia === 'string') { try { guia = JSON.parse(guia); } catch { guia = null; } }
  let extra = r.fuentes_extra;
  if (typeof extra === 'string') { try { extra = JSON.parse(extra); } catch { extra = []; } }
  return {
    ...r,
    guia: guia && typeof guia === 'object' ? limpiarFrases(guia) : null,
    fuentes_extra: Array.isArray(extra) ? extra.filter((x) => typeof x === 'string') : []
  };
}

// ---------------------------------------------------------------------------
// Plantillas HTML
// ---------------------------------------------------------------------------
const ICONO_SOL = '<svg class="taa-icono-sol" width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>';
const ICONO_LUNA = '<svg class="taa-icono-luna" width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>';

const SCRIPT_TEMA_INICIAL = `<script>(function(){try{var s=localStorage.getItem('theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();</script>`;

const SCRIPT_TEMA_BOTON = `<script>(function(){var b=document.getElementById('theme-toggle');if(!b)return;b.onclick=function(){var d=!document.documentElement.classList.contains('dark');document.documentElement.classList.toggle('dark',d);b.setAttribute('aria-pressed',String(d));try{localStorage.setItem('theme',d?'dark':'light');}catch(e){}};b.setAttribute('aria-pressed',String(document.documentElement.classList.contains('dark')));})();</script>`;

function cabeza({ titulo, descripcion, canonico, tipoOg = 'article', tarjetaTw = 'summary', jsonld }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}">
<link rel="canonical" href="${esc(canonico)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="${tipoOg}">
<meta property="og:site_name" content="${NOMBRE}">
<meta property="og:locale" content="es_ES">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descripcion)}">
<meta property="og:url" content="${esc(canonico)}">
<meta property="og:image" content="${SITIO}/logo-taa.png">
<meta name="twitter:card" content="${tarjetaTw}">
<meta name="twitter:title" content="${esc(titulo)}">
<meta name="twitter:description" content="${esc(descripcion)}">
<link rel="icon" type="image/png" href="/logo-taa.png">
${SCRIPT_TEMA_INICIAL}
<script src="/cookie-consent.js" defer></script>
<link rel="stylesheet" href="/styles.css">
<link rel="stylesheet" href="/paginas.css">
<script type="application/ld+json">${jsonSeguro(jsonld)}</script>
</head>`;
}

const CABECERA = `<header class="glass-header taa-header">
  <a class="taa-volver" href="/">&larr; Inicio</a>
  <a class="taa-marca" href="/"><img src="/logo-taa.png" alt="" width="40" height="40"><span>TuAsistente<span class="taa-acento">Andaluz</span></span></a>
  <button id="theme-toggle" class="taa-tema" type="button" aria-label="Cambiar tema">${ICONO_SOL}${ICONO_LUNA}</button>
</header>`;

function pie(categorias) {
  const enlacesCat = categorias
    .map((c) => `<a href="/categoria/${c.slug}/">${esc(c.nombre)}</a>`)
    .join('');
  const legal = '<a href="/legal/aviso-legal/">Aviso legal</a><a href="/legal/privacidad/">Privacidad</a><a href="/legal/cookies/">Cookies</a><a href="/legal/quienes-somos/">Quiénes somos</a><button type="button" class="taa-enlace-boton" onclick="if(window.abrirCookies)window.abrirCookies()">Configurar cookies</button>';
  return `<footer class="taa-pie">
  <nav aria-label="Categorías">${enlacesCat}</nav>
  <nav aria-label="Información legal">${legal}</nav>
  <p>${NOMBRE} es un servicio independiente y no está vinculado a la Junta de Andalucía ni al SEPE. Comprueba siempre los datos en la web oficial antes de solicitar.</p>
</footer>`;
}

function pagina({ head, cuerpo, categorias, hayPrivacidad, scriptsExtra = '' }) {
  return `${head}
<body class="taa-pagina background-radial">
${CABECERA}
${cuerpo}
${pie(categorias)}
${SCRIPT_TEMA_BOTON}
${scriptsExtra}
</body>
</html>
`;
}

function insigniaEstado(t, ahora) {
  const ef = calcularEstado(t, ahora);
  return `<span class="taa-badge taa-badge--${CLASE_ESTADO[ef.estado] || 'desconocido'}" data-taa-estado data-estado="${esc(t.estado)}" data-apertura="${esc(t.fecha_apertura)}" data-cierre="${esc(t.fecha_cierre)}" data-proxima="${esc(t.proxima_apertura)}" data-estimada="${t.apertura_estimada ? '1' : ''}">${esc(ef.etiqueta)}</span>`;
}

// Recalcula la etiqueta en el navegador, por si la página se generó hace días
function scriptEstado() {
  return `<script>
${calcularEstado.toString()}
(function(){
  var clases=${JSON.stringify(CLASE_ESTADO)};
  var els=document.querySelectorAll('[data-taa-estado]');
  for(var i=0;i<els.length;i++){
    var d=els[i].dataset;
    var r=calcularEstado({estado:d.estado,fecha_apertura:d.apertura,fecha_cierre:d.cierre,proxima_apertura:d.proxima,apertura_estimada:d.estimada==='1'},new Date());
    els[i].textContent=r.etiqueta;
    els[i].className='taa-badge taa-badge--'+(clases[r.estado]||'desconocido');
  }
})();
</script>`;
}

// --- Paso a paso -----------------------------------------------------------
// Acepta: lista de pasos, un paso por línea, o todo pegado en un párrafo con
// "Paso 1: ... Paso 2: ..." o "1. ... 2. ...". Devuelve { intro, pasos }.
const NUMERACION = /^\s*(?:Paso\s*\d+\s*[:.\-–)]\s*|\d{1,2}[.)]\s+)/i;
const quitarNumeracion = (s) => String(s).replace(NUMERACION, '').trim();

function pasosDeTexto(valor) {
  if (Array.isArray(valor)) {
    return { intro: '', pasos: valor.map((p) => quitarNumeracion(p)).filter(Boolean) };
  }
  const texto = String(valor ?? '').replace(/\r/g, '').trim();
  if (!texto) return { intro: '', pasos: [] };

  // 1) Un paso por línea
  const lineas = texto.split(/\n+/).map((x) => x.trim()).filter(Boolean);
  if (lineas.length >= 2) return { intro: '', pasos: lineas.map(quitarNumeracion).filter(Boolean) };

  // 2) Todo en un párrafo con "Paso N:" pegados
  const marcasPaso = [...texto.matchAll(/Paso\s*\d+\s*[:.\-–)]/gi)];
  if (marcasPaso.length >= 2) {
    const cortes = marcasPaso.map((m) => m.index);
    const intro = texto.slice(0, cortes[0]).trim();
    const pasos = cortes.map((ini, i) => quitarNumeracion(texto.slice(ini, cortes[i + 1] ?? texto.length))).filter(Boolean);
    return { intro, pasos };
  }

  // 3) Todo en un párrafo con "1. ... 2. ..." (solo si son consecutivos desde el 1, para no cortar por error)
  const numeradas = [...texto.matchAll(/(?:^|\s)(\d{1,2})[.)]\s+(?=\S)/g)];
  if (numeradas.length >= 2 && numeradas.every((m, i) => Number(m[1]) === i + 1)) {
    const cortes = numeradas.map((m) => m.index + (m[0].length - m[0].trimStart().length));
    const intro = texto.slice(0, cortes[0]).trim();
    const pasos = cortes.map((ini, i) => quitarNumeracion(texto.slice(ini, cortes[i + 1] ?? texto.length))).filter(Boolean);
    return { intro, pasos };
  }

  return { intro: '', pasos: [] }; // sin estructura: se mostrará como párrafo
}

// Escapa el texto y convierte en enlace SOLO las URLs de dominios oficiales
function enlazarUrls(texto) {
  return String(texto ?? '').split(/(https?:\/\/[^\s<>"']+)/g).map((parte, i) => {
    if (i % 2 === 0) return esc(parte);
    
    const limpia = parte.replace(/[.,;:!?)\]]+$/, '');
    const resto = parte.slice(limpia.length);
    const seguro = enlaceSeguro(limpia);
    
    // CAMBIO AQUÍ: Si es seguro, creamos un botón bonito con Tailwind en vez de la URL cruda
    const html = seguro
      ? `<a href="${esc(seguro)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 px-2.5 py-1 mt-1 text-sm font-medium text-emerald-700 bg-emerald-100/50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-900/50 break-all">🔗 Enlace oficial</a>`
      : esc(limpia);
      
    return html + esc(resto);
  }).join('');
}

function bloquePasos(valor) {
  const { intro, pasos } = pasosDeTexto(valor);
  if (pasos.length >= 2) {
    return `${intro ? `<p>${enlazarUrls(intro)}</p>` : ''}
      <ol class="taa-pasos-lista">${pasos.map((p) => `<li>${enlazarUrls(p)}</li>`).join('')}</ol>`;
  }
  const texto = (Array.isArray(valor) ? valor.join('\n') : String(valor ?? '')).trim();
  return `<p class="taa-pasos">${enlazarUrls(texto || 'Sigue las instrucciones de la web oficial.')}</p>`;
}

function listaDesdeTexto(valor) {
  if (Array.isArray(valor)) return valor.map(String).filter(Boolean);
  return String(valor ?? '').split(/\n+/).map((s) => s.trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// SEO de cada ficha
// ---------------------------------------------------------------------------
function operadorDe(urlOficial) {
  try {
    const h = new URL(urlOficial).hostname;
    if (h.endsWith('juntadeandalucia.es')) return { nombre: 'Junta de Andalucía', ambito: 'Andalucía', tipo: 'AdministrativeArea' };
    if (h.endsWith('sepe.es') || h.endsWith('sepe.gob.es')) return { nombre: 'Servicio Público de Empleo Estatal (SEPE)', ambito: 'España', tipo: 'Country' };
  } catch { /* sin URL válida */ }
  return null;
}

function titulosSEO(t, operador) {
  const base = !/andaluc/i.test(t.titulo) && operador?.nombre === 'Junta de Andalucía'
    ? `${t.titulo} en Andalucía`
    : t.titulo;
  const candidatos = [
    `${base}: requisitos y cómo solicitar | ${NOMBRE}`,
    `${base}: requisitos y cómo solicitar`,
    `${base} | ${NOMBRE}`,
    base
  ];
  const title = candidatos.find((c) => c.length <= 62) || candidatos[candidatos.length - 1];
  return { title, h1: `${base}: requisitos, plazos y cómo solicitar` };
}

// Corta en el límite de palabra: nunca devuelve más de `max` caracteres ni deja una palabra a medias
function cortarEnPalabra(texto, max) {
  const t = String(texto ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const corte = t.slice(0, max + 1); // +1: si justo después hay un espacio, la última palabra cabe entera
  const i = corte.lastIndexOf(' ');
  const base = i > 0 ? corte.slice(0, i) : t.slice(0, max);
  return base.replace(/[\s,;:.\-–(]+$/, '');
}

// Quita los paréntesis y su contenido (también uno sin cerrar):
// "Beca Adriano (ayuda para facilitar la permanencia...)" -> "Beca Adriano"
function tituloLimpio(titulo) {
  const original = String(titulo ?? '').replace(/\s+/g, ' ').trim();
  const limpio = original
    .replace(/\([^)]*(\)|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\s,;:.\-–]+$/, '');
  return limpio || original;
}

// Palabras que no pueden quedar al final de un texto cortado (preposiciones, artículos, conjunciones...)
const PALABRAS_COLA = new Set([
  'a', 'al', 'ante', 'bajo', 'con', 'contra', 'de', 'del', 'desde', 'durante', 'en', 'entre',
  'hacia', 'hasta', 'mediante', 'para', 'por', 'segun', 'según', 'sin', 'sobre', 'tras',
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo',
  'y', 'e', 'o', 'u', 'ni', 'que', 'como', 'cómo', 'su', 'sus'
]);
const RUIDO_FINAL = /[\s,;:.…\-–]+$/;

// Limpia el final de un texto cortado: quita puntuación suelta, un paréntesis sin cerrar
// y las preposiciones/artículos/conjunciones finales. No añade puntuación.
function quitarCola(texto) {
  let r = String(texto ?? '');
  for (;;) {
    r = r.replace(RUIDO_FINAL, '');
    const abiertos = (r.match(/\(/g) || []).length;
    const cerrados = (r.match(/\)/g) || []).length;
    if (abiertos > cerrados) { r = r.slice(0, r.lastIndexOf('(')); continue; }
    const m = /(?:^|\s)(\S+)$/.exec(r);
    if (m && PALABRAS_COLA.has(m[1].toLowerCase().replace(/[^a-záéíóúüñ]/g, ''))) {
      r = r.slice(0, m.index);
      continue;
    }
    return r;
  }
}

// Ajusta una descripción a `max` caracteres (por defecto 155) y la termina en punto.
// Corta en el último fin de frase dentro del límite; si no hay, en el último espacio.
// Nunca termina en "..." ni en "…", ni en coma, preposición o artículo.
function ajustarDescripcion(texto, max = 155) {
  const t = String(texto ?? '').replace(/\s+/g, ' ').trim();
  const cerrar = (s) => {
    const r = quitarCola(s);
    return r && !/[.!?]$/.test(r) ? `${r}.` : r;
  };

  const completo = cerrar(t);
  if (completo.length <= max) return completo;

  // 1) Último fin de frase dentro del límite (con un mínimo para no dejarla demasiado corta)
  const finales = [...t.matchAll(/[.!?](?=\s|$)/g)].map((m) => m.index + 1).filter((n) => n <= max && n >= 40);
  if (finales.length) return cerrar(t.slice(0, finales[finales.length - 1]));

  // 2) Último espacio, dejando un hueco para el punto final
  const limite = max - 1;
  const corte = t.slice(0, limite + 1);
  const i = corte.lastIndexOf(' ');
  const base = /\s$/.test(corte) ? corte.trimEnd() : i > 0 ? corte.slice(0, i) : t.slice(0, limite);
  return cerrar(base);
}

// Título sin sufijo de marca: es el que usan las migas de pan (máx. 60 caracteres)
function tituloBase(titulo) {
  const t = tituloLimpio(titulo);
  return t.length <= 60 ? t : quitarCola(cortarEnPalabra(t, 60));
}

// <title> de la ficha: Google trunca a ~60 caracteres.
// El sufijo " | TuAsistenteAndaluz" solo se añade si el total no supera 60.
function tituloSeo(titulo) {
  const base = tituloBase(titulo);
  const conMarca = `${base} | ${NOMBRE}`;
  return conMarca.length <= 60 ? conMarca : base;
}

// Meta description de 120-155 caracteres
function metaDescription(titulo, categoria, guia, cuantia = guia?.cuantia) {
  const limpio = tituloLimpio(titulo);
  const corto = cortarEnPalabra(limpio, 50);
  const nombre = corto.length < limpio.length ? quitarCola(corto) : corto;
  const importe = quitarCola(cortarEnPalabra(cuantia, 40));

  let d = importe
    ? `Guía completa de ${nombre}: requisitos, plazos, cuantía (${importe}) y cómo solicitarlo en Andalucía.`
    : `Guía completa de ${nombre}: requisitos, plazos, documentos y cómo solicitarlo en Andalucía.`;

  if (d.length < 120) d += ' Con enlace a la web oficial.';
  if (d.length < 120) d += ` | ${NOMBRE}`;
  return ajustarDescripcion(d, 155);
}

// ---------------------------------------------------------------------------
// Páginas
// ---------------------------------------------------------------------------
function paginaFicha(t, ctx) {
  const { ahora, categorias, hayPrivacidad, porCategoria } = ctx;
  const url = `${SITIO}/ayuda/${t.slug}/`;
  const oficial = enlaceSeguro(t.url_oficial);
  const operador = operadorDe(t.url_oficial);
  const { h1 } = titulosSEO(t, operador); // el h1 mantiene el título completo
  const cat = ctx.categoriaDe(t);
  const tituloMigas = tituloBase(t.titulo); // migas de pan: título sin sufijo
  const title = tituloSeo(t.titulo);
  ctx.titulos?.push({ slug: t.slug, title });
  const descripcion = metaDescription(t.titulo, cat.nombre, t.guia, t.cuantia);
  const g = t.guia;

  const comprobado = fechaLarga(t.revisado_en || t.actualizado_en);
  const modificado = fechaISO(t.actualizado_en || t.revisado_en);

  const requisitos = listaDesdeTexto(g?.requisitos);
  const fuentes = [oficial, ...t.fuentes_extra.map(enlaceSeguro)].filter(Boolean);
  const fuentesUnicas = [...new Set(fuentes)];

  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': `${url}#articulo`,
        headline: title,
        description: descripcion,
        inLanguage: 'es',
        ...(fechaISO(t.created_at) ? { datePublished: fechaISO(t.created_at) } : {}),
        ...(modificado ? { dateModified: modificado } : {}),
        mainEntityOfPage: url,
        author: { '@type': 'Organization', name: NOMBRE, url: SITIO },
        publisher: { '@type': 'Organization', name: NOMBRE, url: SITIO, logo: { '@type': 'ImageObject', url: `${SITIO}/logo-taa.png` } },
        about: { '@id': `${url}#servicio` }
      },
      {
        '@type': 'GovernmentService',
        '@id': `${url}#servicio`,
        name: t.titulo,
        serviceType: cat.nombre,
        ...(operador ? {
          areaServed: { '@type': operador.tipo, name: operador.ambito },
          serviceOperator: { '@type': 'GovernmentOrganization', name: operador.nombre }
        } : {}),
        ...(oficial ? { url: oficial } : {})
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITIO}/` },
          { '@type': 'ListItem', position: 2, name: cat.nombre, item: `${SITIO}/categoria/${cat.slug}/` },
          { '@type': 'ListItem', position: 3, name: tituloMigas, item: url }
        ]
      }
    ]
  };

  const relacionadas = (porCategoria.get(cat.slug) || []).filter((x) => x.slug !== t.slug).slice(0, 5);

  const etiquetas = [
    `<span class="taa-chip">${esc(cat.nombre)}</span>`,
    t.cuantia ? `<span class="taa-chip taa-chip--cuantia">${esc(t.cuantia)}</span>` : '',
    insigniaEstado(t, ahora),
    t.destacado ? '<span class="taa-chip taa-chip--destacado">Destacado</span>' : ''
  ].filter(Boolean).join('\n      ');

  let resumenHtml = '';
  if (t.slug.includes('familia-numerosa') || t.titulo.toLowerCase().includes('familia numerosa')) {
    resumenHtml = `
    <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 1.5rem; border-radius: 0.75rem; margin-top: 2rem; margin-bottom: 2rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <h2 style="margin-top: 0; color: #065f46; font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">⚡ Resumen rápido: Lo que necesitas saber</h2>
      <ul style="margin-bottom: 0; padding-left: 1.2rem; color: #064e3b;">
        <li style="margin-bottom: 0.5rem;"><strong>Cuándo renovar:</strong> En los 3 meses antes de que caduque.</li>
        <li style="margin-bottom: 0.5rem;"><strong>Papeles básicos:</strong> DNI de todos, Libro de Familia y Certificado de Empadronamiento.</li>
        <li><strong>Cómo pedir cita:</strong> Online con certificado digital o presencial en tu Delegación.</li>
      </ul>
      <div style="margin-top: 1.2rem;">
        <a href="https://www.juntadeandalucia.es/servicios/sede/tramites/procedimientos/detalle/7.html" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; justify-content: center; background-color: #10b981; color: white; font-weight: bold; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none; transition: background-color 0.2s;">
          Pedir Cita Previa en la Junta 🔗
        </a>
      </div>
    </div>`;
  } else if (t.slug.includes('tarjeta-sanitaria')) {
    resumenHtml = `
    <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 1.5rem; border-radius: 0.75rem; margin-top: 2rem; margin-bottom: 2rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <h2 style="margin-top: 0; color: #065f46; font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">⚡ Resumen rápido: Lo que necesitas saber</h2>
      <ul style="margin-bottom: 0; padding-left: 1.2rem; color: #064e3b;">
        <li style="margin-bottom: 0.5rem;"><strong>Primera vez:</strong> Presencial en tu Centro de Salud (con DNI, libro de familia y empadronamiento).</li>
        <li style="margin-bottom: 0.5rem;"><strong>Renovación o pérdida:</strong> Online con Cl@ve o certificado digital.</li>
        <li><strong>Tarjeta virtual:</strong> Descarga la app Salud Andalucía (solo si tienes Cl@ve).</li>
      </ul>
      <div style="margin-top: 1.2rem;">
        <a href="https://www.juntadeandalucia.es/servicios/sede/tramites/procedimientos/detalle/7.html" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; justify-content: center; background-color: #10b981; color: white; font-weight: bold; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none; transition: background-color 0.2s;">
          Ir al trámite oficial 🔗
        </a>
      </div>
    </div>`;
  } else if (t.slug.includes('exencion-impuesto-matriculacion')) {
    resumenHtml = `
    <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 1.5rem; border-radius: 0.75rem; margin-top: 2rem; margin-bottom: 2rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <h2 style="margin-top: 0; color: #065f46; font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">⚡ Resumen rápido: Lo que necesitas saber</h2>
      <ul style="margin-bottom: 0; padding-left: 1.2rem; color: #064e3b;">
        <li style="margin-bottom: 0.5rem;"><strong>Para qué sirve:</strong> Evitar pagar el Impuesto de Matriculación (o pagar menos) al comprar un coche.</li>
        <li style="margin-bottom: 0.5rem;"><strong>Cuándo pedirlo:</strong> Siempre ANTES de matricular el vehículo.</li>
        <li><strong>Quién lo tramita:</strong> Es de la Agencia Tributaria (Hacienda), no de la Junta.</li>
      </ul>
      <div style="margin-top: 1.2rem;">
        <a href="https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GZ17.shtml" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; justify-content: center; background-color: #10b981; color: white; font-weight: bold; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none; transition: background-color 0.2s;">
          Ir a la Agencia Tributaria 🔗
        </a>
      </div>
    </div>`;
  } else if (t.slug.includes('subsidio-cotizacion-insuficiente')) {
    resumenHtml = `
    <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 1.5rem; border-radius: 0.75rem; margin-top: 2rem; margin-bottom: 2rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <h2 style="margin-top: 0; color: #065f46; font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">⚡ Resumen rápido: Lo que necesitas saber</h2>
      <ul style="margin-bottom: 0; padding-left: 1.2rem; color: #064e3b;">
        <li style="margin-bottom: 0.5rem;"><strong>Para quién es:</strong> Si has trabajado entre 3 meses (90 días) y menos de 1 año.</li>
        <li style="margin-bottom: 0.5rem;"><strong>Cuánto se cobra:</strong> Unos 570€ al mes los primeros 6 meses.</li>
        <li><strong>Plazo:</strong> Tienes 6 meses desde que te quedaste en paro para pedirlo.</li>
      </ul>
      <div style="margin-top: 1.2rem;">
        <a href="https://www.sepe.es/HomeSepe/prestaciones-desempleo/subsidio-desempleo/subsidio-cotizaciones-insuficientes-he-trabajado-menos-de-un-anyo.html" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; justify-content: center; background-color: #10b981; color: white; font-weight: bold; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none; transition: background-color 0.2s;">
          Ir a la Web del SEPE 🔗
        </a>
      </div>
    </div>`;
  } else if (t.slug.includes('complemento-apoyo-empleo')) {
    resumenHtml = `
    <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 1.5rem; border-radius: 0.75rem; margin-top: 2rem; margin-bottom: 2rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <h2 style="margin-top: 0; color: #065f46; font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">⚡ Resumen rápido: Lo que necesitas saber</h2>
      <ul style="margin-bottom: 0; padding-left: 1.2rem; color: #064e3b;">
        <li style="margin-bottom: 0.5rem;"><strong>Para qué sirve:</strong> Para seguir cobrando el paro o el subsidio mientras trabajas.</li>
        <li style="margin-bottom: 0.5rem;"><strong>Cuándo pedirlo:</strong> En los 15 días hábiles siguientes a empezar el nuevo trabajo.</li>
        <li><strong>Cuánto se cobra:</strong> Tu sueldo + la parte proporcional de tu paro.</li>
      </ul>
      <div style="margin-top: 1.2rem;">
        <a href="https://www.sepe.es/HomeSepe/es/prestaciones-desempleo/complemento-de-apoyo-empleo.html" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; justify-content: center; background-color: #10b981; color: white; font-weight: bold; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none; transition: background-color 0.2s;">
          Ir a la Web del SEPE 🔗
        </a>
      </div>
    </div>`;
  }

  const secciones = g ? `
  <section>
    <h2>¿En qué consiste?</h2>
    <p>${esc(g.que_es)}</p>
  </section>
  ${requisitos.length ? `<section>
    <h2>Requisitos principales</h2>
    <ul>${requisitos.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
  </section>` : ''}
  <section>
    <h2>Plazos</h2>
    <p>${esc(g.plazos || 'Consulta los plazos exactos en la web oficial.')}</p>
  </section>
  ${g.consejos ? `<section>
    <h2>💡 Consejos y avisos importantes</h2>
    <p>${esc(g.consejos)}</p>
  </section>` : ''}
  <section>
    <h2>Cómo solicitarlo paso a paso</h2>
    ${bloquePasos(g.como_solicitar)}
  </section>` : `
  <section>
    <h2>Información</h2>
    <p>Todavía no tenemos la guía de este trámite. Consulta los datos completos en la web oficial.</p>
  </section>`;

  const cuerpo = `<main class="taa-main">
  <nav class="taa-migas" aria-label="Migas de pan">
    <ol>
      <li><a href="/">Inicio</a></li>
      <li><a href="/categoria/${cat.slug}/">${esc(cat.nombre)}</a></li>
      <li aria-current="page">${esc(tituloMigas)}</li>
    </ol>
  </nav>
  <article class="taa-ficha">
    <header>
      <h1>${esc(h1)}</h1>
      <div class="taa-etiquetas">
      ${etiquetas}
      </div>
    </header>
    <div class="taa-aviso" role="note"><strong>Aviso importante:</strong> esta es una guía orientativa basada en fuentes públicas. Los requisitos o el método de solicitud pueden haber cambiado. Comprueba siempre los datos en la web oficial antes de presentar tu solicitud.</div>
    ${resumenHtml}
    ${secciones}
    ${oficial ? `<p class="taa-cta"><a class="taa-boton" href="${esc(oficial)}" target="_blank" rel="noopener noreferrer">Ver en la web oficial</a></p>` : ''}
    <footer class="taa-meta">
      ${comprobado ? `<p>Última comprobación con la fuente oficial: <time datetime="${esc(modificado || '')}">${esc(comprobado)}</time>.</p>` : ''}
      ${fuentesUnicas.length ? `<p>Fuentes: ${fuentesUnicas.map((f) => `<a href="${esc(f)}" target="_blank" rel="noopener noreferrer">${esc(new URL(f).hostname)}</a>`).join(', ')}.</p>` : ''}
      <p>${NOMBRE} es un servicio independiente: no tramitamos solicitudes ni estamos vinculados a la administración.</p>
    </footer>
  </article>
  ${relacionadas.length ? `<aside class="taa-relacionadas">
    <h2>Otras ayudas y trámites de ${esc(cat.nombre)}</h2>
    <ul>${relacionadas.map((x) => `<li><a href="/ayuda/${x.slug}/">${esc(x.titulo)}</a></li>`).join('')}</ul>
    <p><a href="/categoria/${cat.slug}/">Ver todas las de ${esc(cat.nombre)}</a></p>
  </aside>` : ''}
</main>`;

  return pagina({
    head: cabeza({ titulo: title, descripcion, canonico: url, tarjetaTw: 'summary_large_image', jsonld }),
    cuerpo, categorias, hayPrivacidad, scriptsExtra: scriptEstado()
  });
}

function paginaCategoria(cat, lista, ctx) {
  const { ahora, categorias, hayPrivacidad } = ctx;
  const url = `${SITIO}/categoria/${cat.slug}/`;
  const info = INFO_CATEGORIAS[cat.slug] || {
    h1: `Ayudas y trámites de ${cat.nombre} en Andalucía`,
    intro: `Ayudas y trámites de ${cat.nombre} en Andalucía explicados de forma sencilla, con los requisitos, los plazos y los pasos para solicitarlos.`
  };
  const descripcion = recortar(`${info.intro} ${lista.length} fichas con requisitos, plazos y cómo solicitar.`, 158);

  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${url}#pagina`,
        name: info.h1,
        description: descripcion,
        inLanguage: 'es',
        url,
        isPartOf: { '@type': 'WebSite', name: NOMBRE, url: SITIO }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITIO}/` },
          { '@type': 'ListItem', position: 2, name: cat.nombre, item: url }
        ]
      }
    ]
  };

  const tarjetas = lista.map((t) => `<li class="taa-tarjeta">
      <h2><a href="/ayuda/${t.slug}/">${esc(t.titulo)}</a></h2>
      <div class="taa-etiquetas">${t.cuantia ? `<span class="taa-chip taa-chip--cuantia">${esc(t.cuantia)}</span>` : ''}${insigniaEstado(t, ahora)}</div>
      ${t.guia?.que_es ? `<p>${esc(recortar(t.guia.que_es, 170))}</p>` : ''}
      <p><a href="/ayuda/${t.slug}/">Ver requisitos y cómo solicitarla</a></p>
    </li>`).join('\n    ');

  const otras = categorias.filter((c) => c.slug !== cat.slug)
    .map((c) => `<a href="/categoria/${c.slug}/">${esc(c.nombre)}</a>`).join(' · ');

  const cuerpo = `<main class="taa-main">
  <nav class="taa-migas" aria-label="Migas de pan">
    <ol><li><a href="/">Inicio</a></li><li aria-current="page">${esc(cat.nombre)}</li></ol>
  </nav>
  <h1 class="taa-h1">${esc(info.h1)}</h1>
  <p class="taa-intro">${esc(info.intro)}</p>
  <ul class="taa-lista-tarjetas">
    ${tarjetas}
  </ul>
  <p class="taa-otras">Otras categorías: ${otras}</p>
</main>`;

  return pagina({
    head: cabeza({ titulo: `${info.h1} | ${NOMBRE}`.length <= 62 ? `${info.h1} | ${NOMBRE}` : info.h1, descripcion, canonico: url, tipoOg: 'website', jsonld }),
    cuerpo, categorias, hayPrivacidad, scriptsExtra: scriptEstado()
  });
}

function bloqueEnlacesHome(categorias, porCategoria) {
  const grupos = categorias.map((c) => {
    const lista = porCategoria.get(c.slug) || [];
    return `    <div>
      <h3><a href="/categoria/${c.slug}/">${esc(c.nombre)}</a></h3>
      <ul>${lista.map((t) => `<li><a href="/ayuda/${t.slug}/">${esc(t.titulo)}</a></li>`).join('')}</ul>
    </div>`;
  }).join('\n');
  return `<section class="taa-enlaces" aria-labelledby="taa-enlaces-titulo">
  <h2 id="taa-enlaces-titulo">Todas las ayudas y trámites</h2>
  <div class="taa-enlaces-rejilla">
${grupos}
  </div>
</section>`;
}

async function actualizarHome(bloque) {
  const ruta = path.join(PUBLIC, 'index.html');
  const html = await fs.readFile(ruta, 'utf8');
  const re = /<!-- TAA:ENLACES -->[\s\S]*?<!-- \/TAA:ENLACES -->/;
  if (!re.test(html)) return false;
  const nuevo = html.replace(re, () => `<!-- TAA:ENLACES -->\n${bloque}\n<!-- /TAA:ENLACES -->`);
  if (nuevo !== html) await fs.writeFile(ruta, nuevo, 'utf8');
  return true;
}

function generarSitemap(entradas) {
  const filas = entradas.map((e) => `  <url>
    <loc>${esc(e.loc)}</loc>${e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ''}
  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${filas}
</urlset>
`;
}

// ---------------------------------------------------------------------------
// Principal
// ---------------------------------------------------------------------------
async function main() {
  const crudos = await cargarTramites();
  if (!Array.isArray(crudos)) throw new Error('La respuesta no es una lista de trámites.');

  const ahora = new Date();
  const advertencias = [];
  const vistos = new Set();
  const tramites = [];

  for (const r of crudos.map(normalizarRegistro)) {
    if (!r.titulo || !r.slug) { advertencias.push(`Fila sin título o slug (id ${r.id ?? '?'}): omitida.`); continue; }
    if (!SLUG_VALIDO.test(r.slug)) { advertencias.push(`Slug no válido "${r.slug}": omitido.`); continue; }
    if (typeof r.guia_html !== 'string' || !r.guia_html.trim()) { advertencias.push(`"${r.slug}" sin guia_html: omitido.`); continue; }
    if (vistos.has(r.slug)) { advertencias.push(`Slug repetido "${r.slug}": omitido.`); continue; }
    vistos.add(r.slug);
    if (!r.guia?.que_es) advertencias.push(`"${r.slug}" no tiene guía (página con poco contenido).`);
    if (!enlaceSeguro(r.url_oficial)) advertencias.push(`"${r.slug}": sin botón oficial (${motivoEnlaceNoValido(r.url_oficial)}).`);
    tramites.push(r);
  }

  // Seguridad: si Supabase no devuelve nada, NO borramos las páginas que ya existan.
  if (tramites.length === 0) throw new Error('No hay trámites publicados. No se toca nada.');

  // Categorías y listas ordenadas (abiertas primero, luego destacadas, luego A-Z)
  const catMap = new Map();
  const categoriaDe = (t) => {
    const nombre = String(t.categoria || 'Ayudas').trim() || 'Ayudas';
    const slug = slugDe(nombre) || 'ayudas';
    return { slug, nombre };
  };
  const porCategoria = new Map();
  const ordenar = (a, b) =>
    (ORDEN_ESTADO[calcularEstado(a, ahora).estado] ?? 9) - (ORDEN_ESTADO[calcularEstado(b, ahora).estado] ?? 9) ||
    Number(Boolean(b.destacado)) - Number(Boolean(a.destacado)) ||
    a.titulo.localeCompare(b.titulo, 'es');

  for (const t of tramites) {
    const c = categoriaDe(t);
    if (!catMap.has(c.slug)) catMap.set(c.slug, c);
    if (!porCategoria.has(c.slug)) porCategoria.set(c.slug, []);
    porCategoria.get(c.slug).push(t);
  }
  for (const lista of porCategoria.values()) lista.sort(ordenar);

  const categorias = [...catMap.values()].sort((a, b) => {
    const ia = ORDEN_CATEGORIAS.indexOf(a.slug), ib = ORDEN_CATEGORIAS.indexOf(b.slug);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.nombre.localeCompare(b.nombre, 'es');
  });

  const hayPrivacidad = await existe(path.join(PUBLIC, 'privacidad.html'));
  const ctx = { ahora, categorias, hayPrivacidad, porCategoria, categoriaDe, titulos: [] };

  // Todo se genera EN MEMORIA primero; solo si va bien se borra lo anterior y se escribe.
  const archivos = [];
  for (const t of tramites) archivos.push([`ayuda/${t.slug}/index.html`, paginaFicha(t, ctx)]);
  for (const c of categorias) archivos.push([`categoria/${c.slug}/index.html`, paginaCategoria(c, porCategoria.get(c.slug), ctx)]);

  // Solo se borran las carpetas que el generador recrea. public/legal/ NO se toca nunca.
  await fs.rm(path.join(PUBLIC, 'ayuda'), { recursive: true, force: true });
  await fs.rm(path.join(PUBLIC, 'categoria'), { recursive: true, force: true });
  for (const [ruta, html] of archivos) await escribir(ruta, html);

  // Sitemap
  const ultima = (lista) => lista.map((t) => fechaISO(t.actualizado_en || t.revisado_en)).filter(Boolean).sort().pop();
  const entradas = [{ loc: `${SITIO}/`, lastmod: ultima(tramites) }];
  for (const c of categorias) entradas.push({ loc: `${SITIO}/categoria/${c.slug}/`, lastmod: ultima(porCategoria.get(c.slug)) });
  for (const t of tramites) entradas.push({ loc: `${SITIO}/ayuda/${t.slug}/`, lastmod: fechaISO(t.actualizado_en || t.revisado_en) });
  if (hayPrivacidad) entradas.push({ loc: `${SITIO}/privacidad.html`, lastmod: null });
  for (const p of PAGINAS_LEGALES) {
    if (await existe(path.join(PUBLIC, 'legal', p, 'index.html'))) {
      entradas.push({ loc: `${SITIO}/legal/${p}/`, lastmod: null });
    } else {
      advertencias.push(`Falta public/legal/${p}/index.html: no se añade al sitemap.`);
    }
  }
  await escribir('sitemap.xml', generarSitemap(entradas));

  // Enlaces rastreables en la home
  const homeOk = await actualizarHome(bloqueEnlacesHome(categorias, porCategoria));

  // robots.txt
  const robots = path.join(PUBLIC, 'robots.txt');
  if (await existe(robots)) {
    const txt = await fs.readFile(robots, 'utf8');
    if (!/^\s*sitemap:/im.test(txt)) advertencias.push(`public/robots.txt no tiene la línea "Sitemap: ${SITIO}/sitemap.xml".`);
  } else {
    advertencias.push('No existe public/robots.txt.');
  }

  console.log(`\nListo: ${tramites.length} fichas, ${categorias.length} categorías, ${entradas.length} URLs en el sitemap.`);
  console.log('\nTítulos generados (<title>):');
  for (const x of ctx.titulos) console.log(` - ${x.slug} (${x.title.length}): ${x.title}`);
  console.log(homeOk
    ? 'Home: bloque de enlaces actualizado.'
    : 'Home: NO se actualizó. Añade en public/index.html (antes del <footer>) estas dos líneas:\n   <!-- TAA:ENLACES -->\n   <!-- /TAA:ENLACES -->');
  if (advertencias.length) {
    console.log('\nAdvertencias:');
    advertencias.forEach((a) => console.log(' - ' + a));
  }
}

main().catch((e) => {
  console.error('\nError: ' + e.message);
  process.exit(1);
});
