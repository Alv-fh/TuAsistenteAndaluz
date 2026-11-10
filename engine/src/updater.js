// Ejemplos de uso (reanálisis completo):
// node engine/src/updater.js --reanalizar-todo --solo-publicadas --dry-run
// node engine/src/updater.js --reanalizar-todo --solo-publicadas
// node engine/src/updater.js --reanalizar-todo
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
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Uso:
//   node engine/src/updater.js                          flujo normal (todas las filas)
//   node engine/src/updater.js --slug=beca-adriano      solo esa fila
//   node engine/src/updater.js --slug=X --forzar        reanaliza esa fila aunque la web no haya cambiado
//   node engine/src/updater.js --vacias                 solo filas con guia/guia_html vacíos
//   node engine/src/updater.js --reanalizar-todo        reanaliza TODAS las filas (ignora el hash)
//   node engine/src/updater.js --solo-publicadas        atajo de --reanalizar-todo limitado a publicado=true
//   node engine/src/updater.js --solo-cuarentena        atajo de --reanalizar-todo limitado a publicado=false
//   node engine/src/updater.js --no-retirar             flujo normal, pero nunca oculta fichas (solo actualiza contenido)
//   Modificadores: --limite=N (0 = sin límite) y --dry-run (no llama a la IA ni escribe en Supabase)
let args;
try {
  ({ values: args } = parseArgs({
    options: {
      slug: { type: 'string' },
      forzar: { type: 'boolean', default: false },
      vacias: { type: 'boolean', default: false },
      'reanalizar-todo': { type: 'boolean', default: false },
      'solo-publicadas': { type: 'boolean', default: false },
      'solo-cuarentena': { type: 'boolean', default: false },
      limite: { type: 'string', default: '0' },
      'dry-run': { type: 'boolean', default: false },
      'no-retirar': { type: 'boolean', default: false }
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
const SOLO_PUBLICADAS = args['solo-publicadas'];
const SOLO_CUARENTENA = args['solo-cuarentena'];
const REANALIZAR_TODO = args['reanalizar-todo'] || SOLO_PUBLICADAS || SOLO_CUARENTENA; // los --solo-* son atajos
const DRY_RUN = args['dry-run'];
const NO_RETIRAR = args['no-retirar']; // en el flujo normal, nunca pone publicado=false
const LIMITE = Number(args.limite);
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // una fila vacía no se reanaliza si se revisó hace menos de 24 h

if (FORZAR && !SLUG) {
  console.error('Error: --forzar requiere --slug=<slug> (ejemplo: --slug=beca-adriano --forzar).');
  process.exit(1);
}

if (SOLO_PUBLICADAS && SOLO_CUARENTENA) {
  console.error('Error: --solo-publicadas y --solo-cuarentena son mutuamente excluyentes.');
  process.exit(1);
}

if (!Number.isInteger(LIMITE) || LIMITE < 0) {
  console.error(`Error: --limite debe ser un entero >= 0 (recibido: "${args.limite}").`);
  process.exit(1);
}

if (DRY_RUN && !REANALIZAR_TODO) {
  console.error('Error: --dry-run solo se puede usar con --reanalizar-todo o --solo-publicadas.');
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
    if (NO_RETIRAR) {
      const { error } = await supabase.from('tramites').update({ estado: v.estado, revisado_en: ahora }).eq('slug', fila.slug);
      if (error) throw new Error(`Supabase: ${error.message}`);
      return {
        resultado: 'conservada',
        texto: `no vigente (${v.motivo}), pero --no-retirar está activo: se conserva`
      };
    }
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

// ---------------------------------------------------------------------------
// Reanálisis completo (--reanalizar-todo / --solo-publicadas)
// ---------------------------------------------------------------------------

// <raíz del proyecto>/logs, sin depender del directorio desde el que se lance el script
const DIR_LOGS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'logs');

function marcaTiempo() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

const longitudHtml = (h) => (typeof h === 'string' ? h.trim().length : 0);

// Estado guardado de una fila: son las secciones "antes" y "despues" del log
const instantanea = (f) => ({
  html_len: longitudHtml(f.guia_html),
  estado: f.estado ?? null,
  guia: f.guia ?? null,
  guia_html: typeof f.guia_html === 'string' ? f.guia_html : null
});

// Reanaliza una fila. NUNCA sobrescribe la guía si la IA no devuelve una guía válida.
// Si algo falla lanza el error (lo captura reanalizarLote y sigue con la siguiente fila).
async function reanalizarFila(fila, pagina) {
  // Copia en memoria del estado actual, antes de tocar nada
  const backup = { guia: fila.guia ?? null, guia_html: fila.guia_html ?? null, estado: fila.estado ?? null };
  const antes = instantanea(backup);
  const registro = { slug: fila.slug, antes, despues: antes, resultado: null, error: null };

  const fuentes = fuentesDeFila(fila); // URL oficial + fuentes_extra
  if (!fuentes.length) throw new Error('Sin fuentes válidas.');

  const lectura = await leerFuentes(pagina, fuentes);
  if (!lectura.completa) throw new Error('Lectura incompleta de las fuentes.');

  const datos = await analizarAyuda(lectura.texto, fuentes[0], fila.categoria);
  const ahora = new Date().toISOString();

  const guia = datos?.guia ?? null;
  const html = guia ? guiaAHtml(guia) : '';

  if (!datos || guiaVacia({ guia, guia_html: html })) {
    // La fila se marca como revisada, pero no se toca la guía
    registro.resultado = 'descartada';
    console.log('   sin cambios (IA descartó): se conserva la guía anterior.');
    const { error } = await supabase.from('tramites').update({ revisado_en: ahora }).eq('slug', fila.slug);
    if (error) throw new Error(`Supabase: ${error.message}`);
    return registro;
  }

  const v = evaluarVigencia(datos);
  const cambios = {
    guia,
    guia_html: html,
    contenido_hash: lectura.huella,
    revisado_en: ahora,
    actualizado_en: ahora
  };
  if (datos.estado !== 'Desconocido') {
    Object.assign(cambios, {
      estado: v.estado,
      cuantia: datos.cuantia ?? null,
      fecha_apertura: v.fecha_apertura ?? 'No especificada',
      fecha_cierre: datos.fecha_cierre ?? 'No especificada',
      proxima_apertura: datos.proxima_apertura,
      apertura_estimada: datos.apertura_estimada
    });
  }
  if (!v.vigente) {
    // En un reanálisis masivo no se retira nada de la web: se avisa para revisarlo a mano
    registro.aviso = `no vigente (${v.motivo}): no se retira automáticamente`;
    console.log(`   Aviso: ${registro.aviso}.`);
  }

  const estadoNuevo = cambios.estado ?? fila.estado ?? null;
  const cambia = html.trim() !== longitudHtmlTexto(fila.guia_html) || estadoNuevo !== (fila.estado ?? null);
  if (!cambia) delete cambios.actualizado_en;

  const { error } = await supabase.from('tramites').update(cambios).eq('slug', fila.slug);
  if (error) throw new Error(`Supabase: ${error.message}`);

  registro.despues = instantanea({ guia, guia_html: html, estado: estadoNuevo });
  registro.resultado = cambia ? 'actualizada' : 'sin_cambios';
  console.log(
    cambia
      ? `   Actualizada: guia_html ${antes.html_len} -> ${registro.despues.html_len} caracteres, estado ${antes.estado} -> ${registro.despues.estado}.`
      : '   Sin cambios (la IA devolvió la misma guía).'
  );
  return registro;
}

const longitudHtmlTexto = (h) => (typeof h === 'string' ? h.trim() : '');

// Simulación: no abre el navegador, no llama a la IA y no escribe nada.
// Decide solo con guiaVacia(fila) y el estado actual.
function simularLote(filas) {
  let vacias = 0;
  let completas = 0;
  for (const [i, fila] of filas.entries()) {
    const vacia = guiaVacia(fila);
    if (vacia) vacias++;
    else completas++;
    console.log(
      `[${i + 1}/${filas.length}] ${fila.slug}${fila.publicado ? '' : ' (cuarentena)'}: ` +
      (vacia
        ? 'guía vacía o incompleta -> se reanalizaría y se sustituiría si la IA devuelve una guía válida'
        : 'guía completa -> se reanalizaría y se conservaría la actual si la IA la descarta') +
      ` (estado actual: ${fila.estado ?? 'sin estado'}, guia_html: ${longitudHtml(fila.guia_html)} caracteres)`
    );
  }
  console.log('\nResumen (DRY-RUN: no se ha llamado a la IA ni escrito nada en Supabase)');
  console.log(`  Total que se procesarían: ${filas.length}`);
  console.log(`  Con guía vacía o incompleta: ${vacias}`);
  console.log(`  Con guía completa: ${completas}`);
}

async function guardarLog(detalle, cont) {
  try {
    await fs.mkdir(DIR_LOGS, { recursive: true });
    const ruta = path.join(DIR_LOGS, `reanalisis-${marcaTiempo()}.json`);
    const informe = {
      fecha: new Date().toISOString(),
      total: detalle.length,
      actualizadas: cont.actualizadas,
      sin_cambios: cont.sinCambios,
      descartadas: cont.descartadas,
      errores: cont.errores,
      dry_run: false,
      filas: detalle
    };
    await fs.writeFile(ruta, JSON.stringify(informe, null, 2), 'utf8');
    return ruta;
  } catch (e) {
    console.error(`No se pudo guardar el log: ${e.message}`);
    return null;
  }
}

async function reanalizarLote(filas) {
  if (DRY_RUN) return simularLote(filas);

  const detalle = [];
  const cont = { actualizadas: 0, sinCambios: 0, descartadas: 0, errores: 0 };
  const slugsConError = [];

  // Primer Ctrl+C: termina la fila en curso y guarda el log (el segundo Ctrl+C mata el proceso)
  let interrumpido = false;
  const alInterrumpir = () => {
    interrumpido = true;
    console.log('\nInterrupción solicitada: se termina la fila actual y se guarda el log...');
  };
  process.once('SIGINT', alInterrumpir);

  let navegador;
  let rutaLog = null;
  try {
    const abierto = await abrirNavegador();
    navegador = abierto.navegador;

    for (const [i, fila] of filas.entries()) {
      if (interrumpido) break;
      console.log(`\n[${i + 1}/${filas.length}] ${fila.slug}${fila.publicado ? '' : ' (cuarentena)'}`);

      let registro;
      try {
        registro = await reanalizarFila(fila, abierto.pagina);
      } catch (e) {
        // Una fila que falla no detiene el proceso
        console.error(`   Error: ${e.message}`);
        registro = {
          slug: fila.slug,
          antes: instantanea(fila),
          despues: instantanea(fila),
          resultado: 'error',
          error: e.message
        };
        slugsConError.push(fila.slug);
      }
      detalle.push(registro);

      if (registro.resultado === 'actualizada') cont.actualizadas++;
      else if (registro.resultado === 'sin_cambios') cont.sinCambios++;
      else if (registro.resultado === 'descartada') cont.descartadas++;
      else cont.errores++;
    }
  } finally {
    process.removeListener('SIGINT', alInterrumpir);
    await navegador?.close();
    rutaLog = await guardarLog(detalle, cont);
  }

  console.log('\nResumen del reanálisis');
  console.log(`  Total procesadas: ${detalle.length}${interrumpido ? ` de ${filas.length} (interrumpido)` : ''}`);
  console.log(`  Actualizadas: ${cont.actualizadas}`);
  console.log(`  Sin cambios: ${cont.sinCambios}`);
  console.log(`  Descartadas (IA sin guía válida, se conserva la anterior): ${cont.descartadas}`);
  console.log(`  Errores: ${cont.errores}${slugsConError.length ? ` (${slugsConError.join(', ')})` : ''}`);
  if (rutaLog) {
    console.log(`  Log: ${rutaLog}`);
    console.log('  Guarda el log: es tu único rollback. Cópialo a ~/backups/');
  }
  if (cont.errores) process.exitCode = 1;
}

async function main() {
  let consulta = supabase
    .from('tramites').select('*').order('revisado_en', { ascending: true, nullsFirst: true });
  if (SLUG) consulta = consulta.eq('slug', SLUG);
  if (SOLO_PUBLICADAS) consulta = consulta.eq('publicado', true);
  if (SOLO_CUARENTENA) consulta = consulta.eq('publicado', false);

  const { data, error } = await consulta;
  if (error) throw new Error(`Supabase: ${error.message}`);

  let filas = SOLO_VACIAS ? (data ?? []).filter(guiaVacia) : (data ?? []);
  if (LIMITE > 0) filas = filas.slice(0, LIMITE);
  if (!filas.length) {
    return console.log(
      SLUG ? `No hay ningún trámite con slug "${SLUG}"${SOLO_VACIAS ? ' y guía vacía' : ''}.`
        : SOLO_VACIAS ? 'No hay trámites con guía vacía.'
        : 'No hay trámites que actualizar.'
    );
  }

  const modo = [
    SLUG && `slug=${SLUG}`,
    SOLO_VACIAS && 'solo vacías',
    FORZAR && 'forzado',
    REANALIZAR_TODO && 'reanálisis completo',
    SOLO_PUBLICADAS && 'solo publicadas',
    SOLO_CUARENTENA && 'solo cuarentena',
    LIMITE > 0 && `límite=${LIMITE}`,
    DRY_RUN && 'DRY-RUN'
  ].filter(Boolean).join(', ');
  console.log(`Comprobando ${filas.length} trámite(s)${modo ? ` (${modo})` : ''}...`);
  if (REANALIZAR_TODO) return reanalizarLote(filas);
  const { navegador, pagina } = await abrirNavegador();
  const res = { igual: 0, ajustadas: 0, actualizadas: 0, retiradas: 0, conservadas: 0, pendientes: 0, enEspera: 0 };

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
          else if (r.resultado === 'conservada') res.conservadas++;
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
          if (NO_RETIRAR) {
            await supabase.from('tramites')
              .update({ contenido_hash: lectura.huella, revisado_en: ahora }).eq('slug', fila.slug);
            console.log('   Aviso: la IA no la reconoce como una ayuda concreta, pero --no-retirar está activo: se conserva.');
            res.conservadas++;
            continue;
          }
          await retirarDeLaWeb(fila.slug, 'la IA no la reconoce como una ayuda concreta');
          await supabase.from('tramites')
            .update({ contenido_hash: lectura.huella, revisado_en: ahora }).eq('slug', fila.slug);
          console.log('   No es una ayuda concreta: queda oculta y en cuarentena. Revísala con npm run revisar.');
          res.retiradas++;
          continue;
        }

        const v = evaluarVigencia(datos);
        let conservada = false; // no vigente, pero no se retira por --no-retirar
        if (!v.vigente) {
          if (NO_RETIRAR) {
            console.log(`   Aviso: no vigente, pero --no-retirar está activo: se conserva (${v.motivo}).`);
            conservada = true; // se sigue adelante: solo se actualiza el contenido
          } else {
            await retirarDeLaWeb(fila.slug, v.motivo);
            await supabase.from('tramites')
              .update({ contenido_hash: lectura.huella, revisado_en: ahora }).eq('slug', fila.slug);
            console.log(`   No vigente: ${v.motivo}.`);
            res.retiradas++;
            continue;
          }
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
        if (conservada) res.conservadas++;
        else res.actualizadas++;
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
    `${res.retiradas} retiradas, ${res.conservadas} conservadas por --no-retirar, ` +
    `${res.pendientes} pendientes o con error, ` +
    `${res.enEspera} en espera (guía vacía revisada hace menos de 24 h).`
  );
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
