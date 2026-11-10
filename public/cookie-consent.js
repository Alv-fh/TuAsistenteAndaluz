/*
 * Gestión del consentimiento de cookies (RGPD / LSSI).
 *
 * - Sin decisión del usuario NO se carga Google Analytics (ninguna petición a googletagmanager.com).
 * - La decisión se guarda en localStorage durante 12 meses.
 * - window.abrirCookies() vuelve a mostrar el banner para cambiar la decisión.
 */
(function () {
  'use strict';

  var GA_ID = 'G-BV5TZH279Z';
  var CLAVE = 'taa-cookies';
  var MESES_VALIDEZ = 12;
  var ID_BANNER = 'taa-cookies-banner';
  var ACEPTADAS = 'aceptadas';
  var RECHAZADAS = 'rechazadas';

  var analyticsCargado = false;

  // --- Decisión guardada ---------------------------------------------------
  function leerDecision() {
    try {
      var crudo = localStorage.getItem(CLAVE);
      if (!crudo) return null;
      var d = JSON.parse(crudo);
      var valida = d && (d.valor === ACEPTADAS || d.valor === RECHAZADAS) &&
        typeof d.caduca === 'number' && d.caduca > Date.now();
      if (!valida) {
        localStorage.removeItem(CLAVE);
        return null;
      }
      return d.valor;
    } catch (e) {
      return null;
    }
  }

  function guardarDecision(valor) {
    var caduca = new Date();
    caduca.setMonth(caduca.getMonth() + MESES_VALIDEZ);
    try {
      localStorage.setItem(CLAVE, JSON.stringify({ valor: valor, caduca: caduca.getTime() }));
    } catch (e) { /* modo privado o almacenamiento bloqueado: la decisión solo vale para esta visita */ }
  }

  // --- Google Analytics ----------------------------------------------------
  function activarAnalytics() {
    window['ga-disable-' + GA_ID] = false;
    if (analyticsCargado) return;
    analyticsCargado = true;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
  }

  // Borra las cookies _ga* probando el dominio actual y sus dominios superiores
  function borrarCookiesGa() {
    var nombres = document.cookie.split(';')
      .map(function (c) { return c.split('=')[0].trim(); })
      .filter(function (n) { return n.indexOf('_ga') === 0; });
    if (!nombres.length) return;

    var partes = location.hostname.split('.');
    var dominios = [''];
    for (var i = 0; i < partes.length - 1; i++) {
      var d = partes.slice(i).join('.');
      dominios.push(d, '.' + d);
    }
    nombres.forEach(function (n) {
      dominios.forEach(function (d) {
        document.cookie = n + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; path=/' +
          (d ? '; domain=' + d : '');
      });
    });
  }

  function desactivarAnalytics() {
    window['ga-disable-' + GA_ID] = true;
    borrarCookiesGa();
  }

  // --- Banner --------------------------------------------------------------
  function crear(etiqueta, clase, texto) {
    var el = document.createElement(etiqueta);
    if (clase) el.className = clase;
    if (texto) el.textContent = texto;
    return el;
  }

  function decidir(valor) {
    guardarDecision(valor);
    if (valor === ACEPTADAS) activarAnalytics();
    else desactivarAnalytics();
    var banner = document.getElementById(ID_BANNER);
    if (banner) banner.remove();
  }

  function crearBoton(texto, valor) {
    var b = crear('button', 'taa-cookies-btn', texto);
    b.type = 'button';
    b.addEventListener('click', function () { decidir(valor); });
    return b;
  }

  function mostrarBanner(enfocar) {
    var existente = document.getElementById(ID_BANNER);
    if (existente) {
      if (enfocar) existente.querySelector('button').focus();
      return;
    }

    var banner = crear('div', 'taa-cookies');
    banner.id = ID_BANNER;
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-modal', 'false');
    banner.setAttribute('aria-labelledby', 'taa-cookies-titulo');
    banner.setAttribute('aria-describedby', 'taa-cookies-texto');

    var titulo = crear('p', 'taa-cookies-titulo', 'Tu privacidad');
    titulo.id = 'taa-cookies-titulo';

    var texto = crear('p', 'taa-cookies-texto');
    texto.id = 'taa-cookies-texto';
    texto.appendChild(document.createTextNode(
      'Usamos cookies de analítica (Google Analytics) para saber cómo se usa la web y mejorarla. ' +
      'Solo se activan si las aceptas. Puedes cambiar tu decisión cuando quieras desde «Configurar cookies». '
    ));
    var enlace = crear('a', null, 'Más información');
    enlace.href = '/legal/cookies/';
    texto.appendChild(enlace);
    texto.appendChild(document.createTextNode('.'));

    var acciones = crear('div', 'taa-cookies-acciones');
    acciones.appendChild(crearBoton('Rechazar', RECHAZADAS));
    acciones.appendChild(crearBoton('Aceptar', ACEPTADAS));

    banner.appendChild(titulo);
    banner.appendChild(texto);
    banner.appendChild(acciones);
    document.body.appendChild(banner);

    if (enfocar) banner.querySelector('button').focus();
  }

  // Para el botón "Configurar cookies" de los pies de página
  window.abrirCookies = function () { mostrarBanner(true); };

  // --- Arranque ------------------------------------------------------------
  var decision = leerDecision();
  if (decision === ACEPTADAS) {
    activarAnalytics();
  } else {
    // Rechazadas o sin decisión: Analytics desactivado y fuera cualquier cookie _ga anterior
    desactivarAnalytics();
    if (!decision) mostrarBanner(false);
  }
})();
