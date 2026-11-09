// Convierte el objeto `guia` (JSON validado por ai.js / limpiarGuia) en HTML seguro.
// Etiquetas: <h3>, <p>, <ul>, <li>, <strong>, <a>. Nada de markdown ni scripts.
// Todo el texto se escapa; solo se enlazan URLs https de dominios oficiales.

const DOMINIOS_OFICIALES = [
  'juntadeandalucia.es', 'boe.es', 'sepe.es', 'sepe.gob.es', 'seg-social.es',
  'prestaciones.seg-social.es', 'imv.seg-social.es', 'sede.agenciatributaria.gob.es', 'sede.mscbs.gob.es'
];

const esc = (valor) =>
  String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function enlaceSeguro(texto) {
  try {
    const u = new URL(texto);
    const ok = DOMINIOS_OFICIALES.some((d) => u.hostname === d || u.hostname.endsWith('.' + d));
    return u.protocol === 'https:' && ok ? u.href : null;
  } catch {
    return null;
  }
}

function enlazar(texto) {
  return String(texto ?? '')
    .split(/(https?:\/\/[^\s<>"']+)/g)
    .map((parte, i) => {
      if (i % 2 === 0) return esc(parte);
      const limpia = parte.replace(/[.,;:!?)\]]+$/, '');
      const resto = parte.slice(limpia.length);
      const seguro = enlaceSeguro(limpia);
      const html = seguro
        ? `<a href="${esc(seguro)}" target="_blank" rel="noopener noreferrer">${esc(limpia)}</a>`
        : esc(limpia);
      return html + esc(resto);
    })
    .join('');
}

const textoLimpio = (v) => String(v ?? '').trim();
const aLista = (v) => (Array.isArray(v) ? v : []).map(textoLimpio).filter(Boolean);

const parrafo = (t) => `<p>${enlazar(t)}</p>`;
const lista = (items) => `<ul>${items.map((x) => `<li>${enlazar(x)}</li>`).join('')}</ul>`;
const seccion = (titulo, cuerpo) => `<h3>${esc(titulo)}</h3>\n${cuerpo}`;

function pasosHtml(valor) {
  const lineas = Array.isArray(valor)
    ? valor.map(textoLimpio).filter(Boolean)
    : textoLimpio(valor).split(/\r?\n+/).map((l) => l.trim()).filter(Boolean);
  return lineas
    .map((l) => {
      const m = /^(\d{1,2})[.)]\s+(.+)$/.exec(l);
      return m ? `<p><strong>${esc(m[1])}.</strong> ${enlazar(m[2])}</p>` : parrafo(l);
    })
    .join('\n');
}

export function guiaAHtml(guia) {
  if (!guia || typeof guia !== 'object' || Array.isArray(guia)) return '';

  const partes = [];

  const queEs = textoLimpio(guia.que_es);
  if (queEs) partes.push(seccion('¿En qué consiste?', parrafo(queEs)));

  const requisitos = aLista(guia.requisitos);
  if (requisitos.length) partes.push(seccion('Requisitos principales', lista(requisitos)));

  const documentacion = aLista(guia.documentacion);
  if (documentacion.length) partes.push(seccion('Documentación necesaria', lista(documentacion)));

  const plazos = textoLimpio(guia.plazos);
  if (plazos) partes.push(seccion('Plazos', parrafo(plazos)));

  const pasos = pasosHtml(guia.como_solicitar);
  if (pasos) partes.push(seccion('Cómo solicitarlo paso a paso', pasos));

  const consejos = textoLimpio(guia.consejos);
  if (consejos) partes.push(seccion('Consejos y avisos', parrafo(consejos)));

  return partes.join('\n');
}
