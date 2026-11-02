import { config } from './config.js';
import { analizarAyuda } from './lib/ai.js';
import { abrirNavegador, leerFuentes } from './lib/browser.js';
import {
  evaluarVigencia,
  normalizarUrl,
  retirarDeLaWeb,
  supabase
} from './lib/db.js';
const FORZAR = process.argv.includes('--forzar'); // ignora la huella y reanaliza todo

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

  const { error } = await supabase.from('tramites').update(cambios).eq('slug', fila.slug);
  if (error) throw new Error(`Supabase: ${error.message}`);
  return {
    resultado: cambia ? 'ajustada' : 'igual',
    texto: cambia ? `estado ajustado por la fecha de hoy: ${fila.estado} -> ${v.estado}` : 'sin cambios'
  };
}

async function main() {
  const { data: filas, error } = await supabase
    .from('tramites').select('*').order('revisado_en', { ascending: true, nullsFirst: true });
  if (error) throw new Error(`Supabase: ${error.message}`);
  if (!filas.length) return console.log('No hay trámites que actualizar.');

  console.log(`Comprobando ${filas.length} trámite(s)${FORZAR ? ' (modo forzado)' : ''}...`);
  const { navegador, pagina } = await abrirNavegador();
  const res = { igual: 0, ajustadas: 0, actualizadas: 0, retiradas: 0, pendientes: 0 };

  try {
    for (const [i, fila] of filas.entries()) {
      console.log(`\n[${i + 1}/${filas.length}] ${fila.slug}`);
      try {
        const fuentes = fuentesDeFila(fila);
        if (!fuentes.length) throw new Error('Sin fuentes válidas.');

        const lectura = await leerFuentes(pagina, fuentes);
        if (!lectura.completa) {
          console.log('   Lectura incompleta: se omite esta vez para no perder datos.');
          res.pendientes++;
          continue;
        }

        // La web no ha cambiado: no se gasta IA
        if (!FORZAR && lectura.huella === fila.contenido_hash) {
          const r = await reevaluarSinIA(fila);
          console.log(`   La web no ha cambiado: ${r.texto}.`);
          if (r.resultado === 'retirada') res.retiradas++;
          else if (r.resultado === 'ajustada') res.ajustadas++;
          else res.igual++;
          continue;
        }

        console.log(fila.contenido_hash ? '   La web ha cambiado: se reanaliza.' : '   Primera comprobación: se analiza.');
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
            fecha_apertura: v.fecha_apertura ?? 'No especificada',
            fecha_cierre: datos.fecha_cierre ?? 'No especificada',
            proxima_apertura: datos.proxima_apertura,
            apertura_estimada: datos.apertura_estimada
          });
        }
        
        if (datos.guia && datos.guia.que_es) {
          cambios.guia = datos.guia;
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
    `${res.retiradas} retiradas, ${res.pendientes} pendientes o con error.`
  );
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});