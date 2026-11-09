// Rellena guia_html a partir del JSON `guia` ya guardado (sin llamar a la IA).
// Uso:
//   node engine/src/backfill-guia-html.js          solo filas con guia_html vacío
//   node engine/src/backfill-guia-html.js --todos  regenera también las que ya lo tienen
import { supabase } from './lib/db.js';
import { guiaAHtml } from './lib/html.js';

const todos = process.argv.includes('--todos');

function leerGuia(valor) {
  if (typeof valor === 'string') {
    try { return JSON.parse(valor); } catch { return null; }
  }
  return valor && typeof valor === 'object' ? valor : null;
}

const { data, error } = await supabase.from('tramites').select('slug,guia,guia_html').limit(1000);
if (error) {
  console.error(`Supabase (lectura): ${error.message}`);
  process.exit(1);
}

let actualizadas = 0;
let sinGuia = 0;
let errores = 0;

for (const fila of data ?? []) {
  const vacio = typeof fila.guia_html !== 'string' || !fila.guia_html.trim();
  if (!todos && !vacio) continue;

  const html = guiaAHtml(leerGuia(fila.guia));
  if (!html) {
    console.log(`- ${fila.slug}: sin guía aprovechable, se omite.`);
    sinGuia++;
    continue;
  }

  const { error: errUpdate } = await supabase.from('tramites').update({ guia_html: html }).eq('slug', fila.slug);
  if (errUpdate) {
    console.error(`- ${fila.slug}: error al guardar (${errUpdate.message})`);
    errores++;
  } else {
    console.log(`- ${fila.slug}: guia_html generado.`);
    actualizadas++;
  }
}

console.log(`\nListo: ${actualizadas} actualizadas, ${sinGuia} sin guía, ${errores} con error.`);
if (errores) process.exitCode = 1;
