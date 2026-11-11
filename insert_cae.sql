INSERT INTO tramites (
  slug, titulo, categoria, estado, destacado, 
  url_oficial, guia, guia_html, publicado, 
  created_at, actualizado_en, revisado_en
) VALUES (
  'complemento-apoyo-empleo',
  'Complemento de Apoyo al Empleo (CAE)',
  'Empleo',
  'Abierto',
  true,
  'https://www.sepe.es/HomeSepe/es/prestaciones-desempleo/complemento-de-apoyo-empleo.html',
  '{
    "que_es": "Es una ayuda del SEPE que te permite seguir cobrando el paro o el subsidio mientras trabajas. Si encuentras un trabajo a tiempo parcial o a tiempo completo, puedes compatibilizar tu sueldo con una parte de tu prestación por desempleo.",
    "requisitos": [
      "Estar cobrando la prestación contributiva por desempleo o un subsidio.",
      "Trabajar por cuenta ajena (a tiempo parcial o a tiempo completo).",
      "Solicitar el complemento en los 15 días hábiles siguientes al inicio del trabajo.",
      "No haber agotado la prestación que estás cobrando."
    ],
    "plazos": "Tienes 15 días hábiles desde que empiezas a trabajar para solicitar el Complemento de Apoyo al Empleo. Si no lo pides a tiempo, puedes perder parte de la ayuda.",
    "consejos": "El CAE no es una ayuda nueva, es una forma de seguir cobrando tu paro mientras trabajas. La cuantía que te queda de paro se reduce en función de la jornada de tu nuevo trabajo. Si trabajas a tiempo parcial, cobras el paro proporcional a las horas que no trabajas. Si trabajas a tiempo completo, el SEPE te abona la parte de la prestación que te quede pendiente de golpe (pago único) o te la mantiene según el caso.",
    "como_solicitar": "1. Pide cita previa en el SEPE (por internet o por teléfono).\n2. Lleva el DNI, el contrato de trabajo nuevo, y la vida laboral.\n3. En la oficina, solicita el Complemento de Apoyo al Empleo y presenta el contrato.\n4. También puedes solicitarlo online en la Sede Electrónica del SEPE si tienes Cl@ve o certificado digital."
  }'::json,
  '<h3>¿En qué consiste?</h3><p>Es una ayuda del SEPE que te permite seguir cobrando el paro o el subsidio mientras trabajas. Si encuentras un trabajo a tiempo parcial o a tiempo completo, puedes compatibilizar tu sueldo con una parte de tu prestación por desempleo.</p><h3>Requisitos principales</h3><ul><li>Estar cobrando la prestación contributiva por desempleo o un subsidio.</li><li>Trabajar por cuenta ajena (a tiempo parcial o a tiempo completo).</li><li>Solicitar el complemento en los 15 días hábiles siguientes al inicio del trabajo.</li><li>No haber agotado la prestación que estás cobrando.</li></ul><h3>Plazos</h3><p>Tienes 15 días hábiles desde que empiezas a trabajar para solicitar el Complemento de Apoyo al Empleo. Si no lo pides a tiempo, puedes perder parte de la ayuda.</p><h3>Consejos y avisos importantes</h3><p>El CAE no es una ayuda nueva, es una forma de seguir cobrando tu paro mientras trabajas. La cuantía que te queda de paro se reduce en función de la jornada de tu nuevo trabajo. Si trabajas a tiempo parcial, cobras el paro proporcional a las horas que no trabajas. Si trabajas a tiempo completo, el SEPE te abona la parte de la prestación que te quede pendiente de golpe (pago único) o te la mantiene según el caso.</p><h3>Cómo solicitarlo paso a paso</h3><p>1. Pide cita previa en el SEPE (por internet o por teléfono).<br>2. Lleva el DNI, el contrato de trabajo nuevo, y la vida laboral.<br>3. En la oficina, solicita el Complemento de Apoyo al Empleo y presenta el contrato.<br>4. También puedes solicitarlo online en la Sede Electrónica del SEPE si tienes Cl@ve o certificado digital.</p>',
  true,
  NOW(),
  NOW(),
  NOW()
);
