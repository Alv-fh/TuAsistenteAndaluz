INSERT INTO tramites (
  slug, titulo, categoria, estado, destacado, 
  url_oficial, guia, guia_html, publicado, 
  created_at, actualizado_en, revisado_en
) VALUES (
  'bono-social-electrico',
  'Bono Social Eléctrico (Descuento en la factura de la luz)',
  'Ayudas',
  'Abierto',
  true,
  'https://www.bonosocial.gob.es/',
  '{
    "que_es": "Es un descuento en la factura de la luz para consumidores vulnerables. Te pueden descontar el 42,5% de la factura si eres vulnerable, o el 57,5% si eres vulnerable severo.",
    "requisitos": [
      "Estar acogido a la tarifa regulada (PVPC). Si estás en el mercado libre, tienes que cambiarte primero.",
      "Cumplir los límites de renta: por ejemplo, vivir solo con menos de 8.400 € al año (el doble si sois dos personas, etc.).",
      "También lo pueden pedir familias numerosas, quien cobra el Ingreso Mínimo Vital (IMV) o quien cobra la pensión mínima.",
      "Ser el titular del contrato de la luz."
    ],
    "plazos": "No hay plazo cerrado, se puede pedir en cualquier momento. Pero ojo: si lo tienes concedido a 31 de diciembre, al año siguiente te llega también el bono social térmico (para la calefacción).",
    "consejos": "Hay que tener cuidado con las llamadas de comerciales. Si estás en el mercado libre y aceptas una oferta por teléfono, pierdes el derecho al bono social. Tienes que estar en una comercializadora de referencia (tarifa PVPC). Los porcentajes de descuento actuales (42,5% y 57,5%) están vigentes hasta el 31/12/2026.",
    "como_solicitar": "1. Comprueba que estás en el mercado regulado (PVPC). Si no, pide el cambio a tu comercializadora actual o a una de referencia.\n2. Reúne los papeles: DNI, última factura de la luz, y el documento que acredite tu situación (certificado de familia numerosa, justificante del IMV, o la declaración de la renta).\n3. Pide el bono social directamente a tu comercializadora de referencia. Muchas tienen un formulario online o un teléfono de atención.\n4. También puedes informarte en la web del Ministerio (bonosocial.gob.es)."
  }'::json,
  '<h3>¿En qué consiste?</h3><p>Es un descuento en la factura de la luz para consumidores vulnerables. Te pueden descontar el 42,5% de la factura si eres vulnerable, o el 57,5% si eres vulnerable severo.</p><h3>Requisitos principales</h3><ul><li>Estar acogido a la tarifa regulada (PVPC). Si estás en el mercado libre, tienes que cambiarte primero.</li><li>Cumplir los límites de renta: por ejemplo, vivir solo con menos de 8.400 € al año (el doble si sois dos personas, etc.).</li><li>También lo pueden pedir familias numerosas, quien cobra el Ingreso Mínimo Vital (IMV) o quien cobra la pensión mínima.</li><li>Ser el titular del contrato de la luz.</li></ul><h3>Plazos</h3><p>No hay plazo cerrado, se puede pedir en cualquier momento. Pero ojo: si lo tienes concedido a 31 de diciembre, al año siguiente te llega también el bono social térmico (para la calefacción).</p><h3>Consejos y avisos importantes</h3><p>Hay que tener cuidado con las llamadas de comerciales. Si estás en el mercado libre y aceptas una oferta por teléfono, pierdes el derecho al bono social. Tienes que estar en una comercializadora de referencia (tarifa PVPC). Los porcentajes de descuento actuales (42,5% y 57,5%) están vigentes hasta el 31/12/2026.</p><h3>Cómo solicitarlo paso a paso</h3><p><strong>1.</strong> Comprueba que estás en el mercado regulado (PVPC). Si no, pide el cambio a tu comercializadora actual o a una de referencia.<br><strong>2.</strong> Reúne los papeles: DNI, última factura de la luz, y el documento que acredite tu situación (certificado de familia numerosa, justificante del IMV, o la declaración de la renta).<br><strong>3.</strong> Pide el bono social directamente a tu comercializadora de referencia. Muchas tienen un formulario online o un teléfono de atención.<br><strong>4.</strong> También puedes informarte en la web del Ministerio (bonosocial.gob.es).</p>',
  true,
  NOW(),
  NOW(),
  NOW()
);
