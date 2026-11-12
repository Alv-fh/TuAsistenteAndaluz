import { supabase } from './lib/db.js';
import { guiaAHtml } from './lib/html.js';

const SLUG = 'capitalizacion-paro';

async function main() {
  console.log('Comprobando si ya existe...');
  const { data: existente } = await supabase
    .from('tramites')
    .select('id')
    .eq('slug', SLUG)
    .single();

  if (existente) {
    console.log(`El trámite "${SLUG}" ya existe. No se hace nada.`);
    return;
  }

  const guia = {
    que_es: 'Es la posibilidad de cobrar en un pago único la prestación contributiva por desempleo pendiente de recibir, para iniciar una actividad como autónomo o montar una empresa.',
    requisitos: [
      'Tener pendiente de cobrar al menos 3 meses de prestación contributiva.',
      'No haber iniciado la actividad económica (no estar dado de alta como autónomo) antes de solicitar la capitalización.',
      'No haber obtenido la capitalización del paro en los últimos 4 años.',
      'Solicitar la capitalización antes de darse de alta en el RETA o como socio de una cooperativa/sociedad laboral.'
    ],
    plazos: 'Debes solicitarlo ANTES de darte de alta como autónomo. Si te das de alta primero, pierdes el derecho a cobrar el paro de golpe. Una vez cobrado, tienes 1 mes para iniciar la actividad y justificar la inversión ante el SEPE.',
    como_solicitar: [
      'Comprueba en tu oficina del SEPE que tienes al menos 3 meses de paro pendientes.',
      'Solicita el pago único en la oficina del SEPE o por su Sede Electrónica, ANTES de darte de alta como autónomo.',
      'Espera la resolución favorable por parte del SEPE.',
      'Inicia tu actividad como autónomo en el plazo máximo de 1 mes desde el cobro.',
      'Justifica la inversión realizada ante el SEPE con las facturas correspondientes.'
    ],
    consejos: 'Es fundamental NO darse de alta como autónomo hasta que el SEPE apruebe la capitalización. Si te das de alta antes, el sistema entenderá que ya has iniciado la actividad y podrías perder el derecho al pago único.'
  };

  const guiaHtml = guiaAHtml(guia);

  const { data, error } = await supabase
    .from('tramites')
    .insert({
      slug: SLUG,
      titulo: 'Capitalización del paro (Pago único) para emprender',
      categoria: 'Empleo',
      estado: 'Abierto',
      destacado: true,
      publicado: true,
      url_oficial: 'https://www.sepe.es/HomeSepe/Personas/distributiva-prestaciones/ayudas-prestaciones-capitalizacion-pago-unico.html',
      cuantia: 'Hasta el 100% de la prestación pendiente (o 12 mensualidades)',
      origen: 'manual',
      guia: guia,
      guia_html: guiaHtml
    })
    .select()
    .single();

  if (error) {
    console.error('Error al insertar:', error.message);
  } else {
    console.log('Trámite insertado correctamente:', data.slug);
  }
}

main();

