-- Fichas nuevas: subsidio para mayores de 52 años y ayudas al alquiler de la Junta.
-- Ejecutar UNA vez en el editor SQL de Supabase y después: node scripts/generar-paginas.mjs
-- Los enlaces internos de los textos usan la sintaxis [texto](/ruta/); el generador los convierte en <a>.

insert into tramites (
  slug, titulo, categoria, cuantia, destacado, publicado, origen,
  estado, fecha_apertura, fecha_cierre, proxima_apertura, apertura_estimada,
  url_oficial, guia, guia_html, revisado_en, actualizado_en
) values (
  'subsidio-mayores-52',
  'Subsidio para mayores de 52 años',
  'Empleo',
  '480 €/mes',
  false,
  true,
  'manual',
  'Abierto',
  'No especificada',
  'No especificada',
  null,
  false,
  'https://www.sepe.es',
  $json${
    "que_es": "Es un subsidio del SEPE para personas desempleadas de 52 años o más que se cobra hasta la jubilación y que, además, cotiza para la pensión, así que no se pierde pensión mientras se cobra.",
    "requisitos": [
      "Tener 52 años o más y estar en desempleo.",
      "Estar inscrito como demandante de empleo.",
      "Haber cotizado al menos 6 años por desempleo y cumplir los requisitos para la jubilación, salvo la edad.",
      "No superar 915,75 €/mes brutos de ingresos propios.",
      "Comprueba todos los requisitos en la web del SEPE antes de solicitar."
    ],
    "documentacion": [],
    "plazos": "Se puede solicitar durante todo el año. Consulta en la web oficial del SEPE los plazos de cada trámite.",
    "como_solicitar": "1. Antes de pedirlo, [inscríbete como demandante de empleo en el SAE](/guia-inscripcion-sae.html).\n2. Solicítalo online en la sede electrónica del SEPE (sede.sepe.gob.es) con Cl@ve o certificado digital.\n3. Si prefieres hacerlo en persona, pide cita previa en una oficina de prestaciones del SEPE.",
    "consejos": "Cada año hay que presentar al SEPE la declaración anual de rentas. Si no se presenta, se interrumpe el pago.\nEs compatible con el [Ingreso Mínimo Vital](/ayuda/ingreso-minimo-vital/): el subsidio cuenta como ingreso y el IMV puede completar la diferencia. Compruébalo en el simulador de la Seguridad Social (imv.seg-social.es).\nSi vives de alquiler, mira las [ayudas al alquiler de la Junta de Andalucía](/ayuda/ayudas-alquiler-junta-andalucia/)."
  }$json$::jsonb,
  $html$<h3>¿En qué consiste?</h3>
<p>Es un subsidio del SEPE para personas desempleadas de 52 años o más que se cobra hasta la jubilación y que, además, cotiza para la pensión, así que no se pierde pensión mientras se cobra.</p>
<h3>Requisitos principales</h3>
<ul><li>Tener 52 años o más y estar en desempleo.</li><li>Estar inscrito como demandante de empleo.</li><li>Haber cotizado al menos 6 años por desempleo y cumplir los requisitos para la jubilación, salvo la edad.</li><li>No superar 915,75 €/mes brutos de ingresos propios.</li><li>Comprueba todos los requisitos en la web del SEPE antes de solicitar.</li></ul>
<h3>Plazos</h3>
<p>Se puede solicitar durante todo el año. Consulta en la web oficial del SEPE los plazos de cada trámite.</p>
<h3>Cómo solicitarlo paso a paso</h3>
<p><strong>1.</strong> Antes de pedirlo, <a href="/guia-inscripcion-sae.html">inscríbete como demandante de empleo en el SAE</a>.</p>
<p><strong>2.</strong> Solicítalo online en la sede electrónica del SEPE (sede.sepe.gob.es) con Cl@ve o certificado digital.</p>
<p><strong>3.</strong> Si prefieres hacerlo en persona, pide cita previa en una oficina de prestaciones del SEPE.</p>
<h3>Consejos y avisos</h3>
<p>Cada año hay que presentar al SEPE la declaración anual de rentas. Si no se presenta, se interrumpe el pago.</p>
<p>Es compatible con el <a href="/ayuda/ingreso-minimo-vital/">Ingreso Mínimo Vital</a>: el subsidio cuenta como ingreso y el IMV puede completar la diferencia. Compruébalo en el simulador de la Seguridad Social (imv.seg-social.es).</p>
<p>Si vives de alquiler, mira las <a href="/ayuda/ayudas-alquiler-junta-andalucia/">ayudas al alquiler de la Junta de Andalucía</a>.</p>$html$,
  '2026-11-15T12:00:00+01:00',
  '2026-11-15T12:00:00+01:00'
),
(
  'ayudas-alquiler-junta-andalucia',
  'Ayudas al alquiler de la Junta de Andalucía',
  'Vivienda',
  null,
  false,
  true,
  'manual',
  'Cerrado',
  'No especificada',
  'No especificada',
  null,
  false,
  'https://www.juntadeandalucia.es',
  $json${
    "que_es": "Son ayudas de la Junta de Andalucía para pagar el alquiler de tu vivienda habitual y permanente. Salen por convocatorias, y cada una fija sus propios requisitos, cuantías y plazos.",
    "requisitos": [
      "Contrato de alquiler a tu nombre (también vale el de una habitación).",
      "Que sea tu vivienda habitual y permanente.",
      "El resto de requisitos (ingresos, colectivos…) los fija cada convocatoria: consúltalos en el BOJA y en la web de la Junta cuando se publique."
    ],
    "documentacion": [],
    "plazos": "No hay un plazo abierto fijo: depende de cada convocatoria. Si no se pide dentro del plazo, hay que esperar a la siguiente.",
    "como_solicitar": "1. Consulta el BOJA (https://www.juntadeandalucia.es/eboja) y la web de la Junta (https://www.juntadeandalucia.es) para saber si hay una convocatoria abierta.\n2. Lee en la convocatoria los requisitos, la documentación y el plazo.\n3. Ten preparado tu contrato de alquiler a tu nombre.\n4. Presenta la solicitud en el plazo y por el medio que indique la convocatoria.",
    "consejos": "Prepara ya el contrato de alquiler para poder pedirla en cuanto se abra el plazo.\nSi tienes menos de 36 años, mira también el [Bono Alquiler Joven](/ayuda/bono-alquiler-joven/).\nSi cobras el [subsidio para mayores de 52 años](/ayuda/subsidio-mayores-52/) o el [Ingreso Mínimo Vital](/ayuda/ingreso-minimo-vital/), consulta también esas fichas."
  }$json$::jsonb,
  $html$<h3>¿En qué consiste?</h3>
<p>Son ayudas de la Junta de Andalucía para pagar el alquiler de tu vivienda habitual y permanente. Salen por convocatorias, y cada una fija sus propios requisitos, cuantías y plazos.</p>
<h3>Requisitos principales</h3>
<ul><li>Contrato de alquiler a tu nombre (también vale el de una habitación).</li><li>Que sea tu vivienda habitual y permanente.</li><li>El resto de requisitos (ingresos, colectivos…) los fija cada convocatoria: consúltalos en el BOJA y en la web de la Junta cuando se publique.</li></ul>
<h3>Plazos</h3>
<p>No hay un plazo abierto fijo: depende de cada convocatoria. Si no se pide dentro del plazo, hay que esperar a la siguiente.</p>
<h3>Cómo solicitarlo paso a paso</h3>
<p><strong>1.</strong> Consulta el BOJA (<a href="https://www.juntadeandalucia.es/eboja" target="_blank" rel="noopener noreferrer">https://www.juntadeandalucia.es/eboja</a>) y la web de la Junta (<a href="https://www.juntadeandalucia.es" target="_blank" rel="noopener noreferrer">https://www.juntadeandalucia.es</a>) para saber si hay una convocatoria abierta.</p>
<p><strong>2.</strong> Lee en la convocatoria los requisitos, la documentación y el plazo.</p>
<p><strong>3.</strong> Ten preparado tu contrato de alquiler a tu nombre.</p>
<p><strong>4.</strong> Presenta la solicitud en el plazo y por el medio que indique la convocatoria.</p>
<h3>Consejos y avisos</h3>
<p>Prepara ya el contrato de alquiler para poder pedirla en cuanto se abra el plazo.</p>
<p>Si tienes menos de 36 años, mira también el <a href="/ayuda/bono-alquiler-joven/">Bono Alquiler Joven</a>.</p>
<p>Si cobras el <a href="/ayuda/subsidio-mayores-52/">subsidio para mayores de 52 años</a> o el <a href="/ayuda/ingreso-minimo-vital/">Ingreso Mínimo Vital</a>, consulta también esas fichas.</p>$html$,
  '2026-11-15T12:00:00+01:00',
  '2026-11-15T12:00:00+01:00'
);
