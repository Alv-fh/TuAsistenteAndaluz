import { config } from './config.js';
import { analizarAyuda } from './lib/ai.js';
import { abrirNavegador, leerFuentes } from './lib/browser.js';
import {
  evaluarVigencia,
  guiaVacia,
  normalizarUrl,
  retirarDeLaWeb,
  supabase
} from './lib/db.js';
import { guiaAHtml } from './lib/html.js';
import { parseArgs } from 'node:util';

// Uso:
//   node engine/src/updater.js                          flujo normal (todas las filas)
//   node engine/src/updater.js --slug=beca-adriano      solo esa fila
//   node engine/src/updater.js --slug=X --forzar        reanaliza esa fila aunque la web no haya cambiado
//   node engine/src/updater.js --vacias                 solo filas con guia/guia_html vacíos
let args;
try {
  ({ values: args } = parseArgs({
    options: {
      slug: { type: 'string' },
      forzar: { type: 'boolean', default: false },
      vacias: { type: 'boolean', default: false }
    },
    strict: true
  }));
} catch (e) {
  console.error(`Error en los argumentos: ${e.message}`);
  process.exit(1);
}

const FORZAR = args.forzar; // ignora la huella y reanaliza la fila indicada con --slug
const SLUG = args.slug?.trim() || null;
const SOLO_VACIAS = args.vacias;
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // una fila vacía no se reanaliza si se revisó hace menos de 24 h

if (FORZAR && !SLUG) {
  console.error('Error: --forzar requiere --slug=<slug> (ejemplo: --slug=beca-adriano --forzar).');
  process.exit(1);
}

function fuentesDeFila(fila) {
  const conf = config.crawler.urlsDirectas.find((d) => d.slug === fila.slug);
  const base = conf?.fuentes ?? [fila.url_oficial];
  const extra = Array.isArray(fila.fuentes_extra) ? fila.fuentes_extra : [];
  return [...new Set([...base, ...extra].map(normalizarUrl).filter(Boolean))];
}

// La web no ha cambiado, pero el calendario sí: se reevalúa con la fecha de hoy, sin gastar IA
async function reevaluarSinIA(fila) {
  const v = evaluarVigencia({ ...fila, ultima_convocatoria_fin: null });
  const ahora = new Date().toISOString();

  if (!v.vigente) {
    await supabase.from('tramites').update({ publicado: false, revisado_en: ahora }).eq('slug', fila.slug);
    return { resultado: 'retirada', texto: `retirada (${v.motivo})` };
  }

  const nuevaApertura = v.fecha_apertura ?? 'No especificada';
  const cambia = v.estado !== fila.estado || nuevaApertura !== (fila.fecha_apertura ?? 'No especificada');
  const cambios = { revisado_en: ahora };
  if (cambia) Object.assign(cambios, { estado: v.estado, fecha_apertura: nuevaApertura, actualizado_en: ahora });

  // Si falta guia_html pero la guía existe, se genera sin gastar IA
  const sinHtml = typeof fila.guia_html !== 'string' || !fila.guia_html.trim();
  if (sinHtml) {
    const html = guiaAHtml(fila.guia);
    if (html) cambios.guia_html = html;
  }

  const { error } = await supabase.from('tramites').update(cambios).eq('slug', fila.slug);
  if (error) throw new Error(`Supabase: ${error.message}`);
  return {
    resultado: cambia ? 'ajustada' : 'igual',
    texto: cambia ? `estado ajustado por la fecha de hoy: ${fila.estado} -> ${v.estado}` : 'sin cambios'
  };
}

async function main() {
  let consulta = supabase
    .from('tramites').select('*').order('revisado_en', { ascending: true, nullsFirst: true });
  if (SLUG) consulta = consulta.eq('slug', SLUG);

  const { data, error } = await consulta;
  if (error) throw new Error(`Supabase: ${error.message}`);

  const filas = SOLO_VACIAS ? (data ?? []).filter(guiaVacia) : (data ?? []);
  if (!filas.length) {
    return console.log(
      SLUG ? `No hay ningún trámite con slug "${SLUG}"${SOLO_VACIAS ? ' y guía vacía' : ''}.`
        : SOLO_VACIAS ? 'No hay trámites con guía vacía.'
        : 'No hay trámites que actualizar.'
    );
  }

  const modo = [SLUG && `slug=${SLUG}`, SOLO_VACIAS && 'solo vacías', FORZAR && 'forzado'].filter(Boolean).join(', ');
  console.log(`Comprobando ${filas.length} trámite(s)${modo ? ` (${modo})` : ''}...`);
  const { navegador, pagina } = await abrirNavegador();
  const res = { igual: 0, ajustadas: 0, actualizadas: 0, retiradas: 0, pendientes: 0, enEspera: 0 };

  try {
    for (const [i, fila] of filas.entries()) {
      console.log(`\n[${i + 1}/${filas.length}] ${fila.slug}`);
      try {
        const vacia = guiaVacia(fila);

        // Cooldown: una guía vacía que se revisó hace poco no se vuelve a intentar (salvo --forzar)
        if (vacia && !FORZAR && fila.revisado_en) {
          const hace = Date.now() - new Date(fila.revisado_en).getTime();
          if (hace < COOLDOWN_MS) {
            console.log(`   Guía vacía, pero revisada hace ${Math.round(hace / 3600000)} h: en espera (usa --slug=${fila.slug} --forzar).`);
            res.enEspera++;
            continue;
          }
        }

        const fuentes = fuentesDeFila(fila);
        if (!fuentes.length) throw new Error('Sin fuentes válidas.');

        const lectura = await leerFuentes(pagina, fuentes);
        if (!lectura.completa) {
          console.log('   Lectura incompleta: se omite esta vez para no perder datos.');
          res.pendientes++;
          continue;
        }

        // La web no ha cambiado: no se gasta IA
        if (!FORZAR && !vacia && lectura.huella === fila.contenido_hash) {
          const r = await reevaluarSinIA(fila);
          console.log(`   La web no ha cambiado: ${r.texto}.`);
          if (r.resultado === 'retirada') res.retiradas++;
          else if (r.resultado === 'ajustada') res.ajustadas++;
          else res.igual++;
          continue;
        }

        console.log(
          FORZAR ? '   Modo forzado: se reanaliza.'
            : vacia && lectura.huella === fila.contenido_hash ? '   La web no ha cambiado, pero la guía está vacía: se reanaliza.'
            : fila.contenido_hash ? '   La web ha cambiado: se reanaliza.'
            : '   Primera comprobación: se analiza.'
        );
        const datos = await analizarAyuda(lectura.texto, fuentes[0], fila.categoria);
        const ahora = new Date().toISOString();

        if (!datos) {
          await retirarDeLaWeb(fila.slug, 'la IA no la reconoce como una ayuda concreta');
          await supabase.from('tramites')
            .update({ contenido_hash: lectura.huella, revisado_en: ahora }).eq('slug', fila.slug);
          console.log('   No es una ayuda concreta: queda oculta y en cuarentena. Revísala con npm run revisar.');
          res.retiradas++;
          continue;
        }

        const v = evaluarVigencia(datos);
        if (!v.vigente) {
          await retirarDeLaWeb(fila.slug, v.motivo);
          await supabase.from('tramites')
            .update({ contenido_hash: lectura.huella, revisado_en: ahora }).eq('slug', fila.slug);
          console.log(`   No vigente: ${v.motivo}.`);
          res.retiradas++;
          continue;
        }

                const cambios = { contenido_hash: lectura.huella, revisado_en: ahora, actualizado_en: ahora };
        
        if (datos.estado === 'Desconocido') {
          console.log('   La IA no pudo determinar el estado: se conserva el anterior.');
        } else {
          Object.assign(cambios, {
            estado: v.estado,
            cuantia: datos.cuantia ?? null,
            fecha_apertura: v.fecha_apertura ?? 'No especificada',
            fecha_cierre: datos.fecha_cierre ?? 'No especificada',
            proxima_apertura: datos.proxima_apertura,
            apertura_estimada: datos.apertura_estimada
          });

          // Lógica de destacado
          if (v.estado === 'Abierto' || v.estado === 'Próximamente') {
            cambios.destacado = true;
          } else if (v.estado === 'Cerrado') {
            cambios.destacado = false;
          }
        }
        
        const guiaHtml = guiaAHtml(datos.guia);
        if (guiaHtml) {
          cambios.guia = datos.guia;
          cambios.guia_html = guiaHtml;
        }

        const guiaCambia = datos.guia && JSON.stringify(datos.guia) !== JSON.stringify(fila.guia);
        
        const { error: e } = await supabase.from('tramites').update(cambios).eq('slug', fila.slug);
        if (e) throw new Error(`Supabase: ${e.message}`);
        console.log(`   Actualizada (${cambios.estado ?? fila.estado}${guiaCambia ? ', guía renovada' : ''}).`);
        res.actualizadas++;
      } catch (e) {
        console.error(`   Error: ${e.message}`);
        res.pendientes++;
      }
    }
  } finally {
    await navegador.close();
  }

  console.log(
    `\nResumen: ${res.actualizadas} reanalizadas, ${res.ajustadas} ajustadas por fecha, ${res.igual} sin cambios, ` +
    `${res.retiradas} retiradas, ${res.pendientes} pendientes o con error, ` +
    `${res.enEspera} en espera (guía vacía revisada hace menos de 24 h).`
  );
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
