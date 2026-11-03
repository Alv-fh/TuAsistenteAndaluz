// 1. Configuración de Supabase.
const SUPABASE_URL = 'https://atffndqbkgqhetkokasp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0ZmZuZHFia2dxaGV0a29rYXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNTY5MTEsImV4cCI6MjEwODkzMjkxMX0.0rvH6dCri-16tznn15JQkcYSJYPBD1GpaBLz8QROsg4';

// URL oficial para consultar el estado de las becas
const URL_CONSULTA_BECAS = 'https://www.juntadeandalucia.es/educacion/becasweb/consultawebbecas?redirect=/educacion/portales/web/educacion/becas-ayudas/becas/convocatoria-general';

const clienteSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let todosLosTramites = [];

// 2. Utilidades de renderizado seguro
function crearElemento(etiqueta, clases, texto = null) {
  const el = document.createElement(etiqueta);
  if (clases) el.className = clases;
  if (texto !== null) el.textContent = texto;
  return el;
}

function crearIconoSVG(pathData) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'w-4 h-4 inline-block mr-1.5 -mt-0.5');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', pathData);
  svg.appendChild(path);
  return svg;
}

const DOMINIOS_OFICIALES = ['juntadeandalucia.es', 'boe.es'];
function enlaceSeguro(texto) {
  try {
    const u = new URL(texto);
    const dominioOk = DOMINIOS_OFICIALES.some((d) => u.hostname === d || u.hostname.endsWith('.' + d));
    return u.protocol === 'https:' && dominioOk ? u.href : null;
  } catch {
    return null;
  }
}

const normalizar = (t) =>
  String(t ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const hayFecha = (f) => Boolean(f) && f !== 'No especificada';

// 3. Fechas y estado
function parseFecha(s) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s ?? ''));
  if (!m) return null;
  const f = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return Number.isNaN(f.getTime()) ? null : f;
}

function hoy() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function estadoEfectivo(t) {
  const h = hoy();
  const ap = parseFecha(t.fecha_apertura);
  const ci = parseFecha(t.fecha_cierre);
  const hayProxima = Boolean(t.proxima_apertura);
  let estado = t.estado;
  let apertura = ap;

  if (estado === 'Abierto' && ci && ci < h) estado = 'Cerrado';
  if (estado === 'Próximamente' && ap && ap <= h && ci && ci >= h) estado = 'Abierto';
  if (estado === 'Cerrado' && hayProxima) estado = 'Próximamente';
  if (estado === 'Próximamente' && !hayProxima && ci && ci < h) estado = 'Cerrado';
  if (estado === 'Próximamente' && apertura && apertura <= h) apertura = null;
  if (estado === 'Próximamente' && !apertura && !hayProxima) estado = 'Desconocido';

  return { estado, abre: apertura ? t.fecha_apertura : null };
}

const ESTILOS_ESTADO = {
  'Abierto': {
    clase: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    etiqueta: (t) => (hayFecha(t.fecha_cierre) ? `Abierto hasta el ${t.fecha_cierre}` : 'Plazo abierto')
  },
  'Próximamente': {
    clase: 'bg-amber-50 border-amber-200 text-amber-700',
    etiqueta: (t, ef) => {
      if (ef.abre) return `Abre el ${ef.abre}`;
      if (t.proxima_apertura) return t.apertura_estimada ? `${t.proxima_apertura} (sin confirmar)` : t.proxima_apertura;
      return 'Próximamente';
    }
  },
  'Cerrado': {
    clase: 'bg-rose-50/50 border-rose-100 text-rose-600/80',
    etiqueta: (t) => (hayFecha(t.fecha_cierre) ? `Cerró el ${t.fecha_cierre}` : 'Plazo cerrado')
  },
  'Desconocido': {
    clase: 'bg-slate-100 border-slate-200 text-slate-600',
    etiqueta: () => 'Consulta el plazo en la web oficial'
  }
};

const ORDEN_ESTADO = { 'Abierto': 0, 'Próximamente': 1, 'Cerrado': 2, 'Desconocido': 3 };

const ICONO_CATEGORIA = 'M12 4.25l-10.5 5.5 10.5 5.5 8.25-4.318V15.5h2.25V9.75L12 4.25z M12 17.25l-8.25-4.318V15l8.25 4.5 8.25-4.5v-2.068L12 17.25z';
const ICONO_CALENDARIO = 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5';
const ICONO_EURO = 'M21 7.125C21 5.399 16.97 4 12 4s-9 1.399-9 3.125c0 1.726 4.03 3.125 9 3.125s9-1.399 9-3.125zM12 11.875c-4.321 0-8.212-1.041-8.995-2.454C3.003 9.7 3 9.911 3 10.125c0 1.726 4.03 3.125 9 3.125s9-1.399 9-3.125c0-.214-.003-.425-.005-.704-.783 1.413-4.674 2.454-8.995 2.454zM12 16.625c-4.321 0-8.212-1.041-8.995-2.454C3.003 14.45 3 14.661 3 14.875c0 1.726 4.03 3.125 9 3.125s9-1.399 9-3.125c0-.214-.003-.425-.005-.704-.783 1.413-4.674 2.454-8.995 2.454z';
// 4. Dibujar los trámites
function renderizarTramites(tramites) {
  const contenedor = document.getElementById('contenedor-tramites');
  contenedor.textContent = '';

  if (tramites.length === 0) {
    contenedor.appendChild(
      crearElemento('p', 'text-slate-500 col-span-full text-center font-medium py-8', 'No se han encontrado trámites con esa búsqueda.')
    );
    return;
  }

  tramites.forEach((tramite) => {
    const tarjeta = crearElemento('div', 'glass-card flex flex-col gap-3');

    const cabecera = crearElemento('div', 'flex justify-between items-start gap-4');
    cabecera.appendChild(crearElemento('h3', 'text-lg font-bold text-slate-800 leading-tight titulo-truncado', tramite.titulo));
    if (tramite.destacado) {
      cabecera.appendChild(
        crearElemento('span', 'bg-emerald-100 text-emerald-800 text-xs font-extrabold px-3 py-1 rounded-full whitespace-nowrap shadow-sm', 'Destacado')
      );
    }
    tarjeta.appendChild(cabecera);

    const detalles = crearElemento('div', 'flex flex-wrap gap-2 text-sm font-semibold mb-4 mt-auto');

    const tagCat = crearElemento('span', 'flex items-center bg-slate-100/80 px-2.5 py-1 rounded-md border border-slate-200/60 text-slate-600 shadow-sm');
    tagCat.appendChild(crearIconoSVG(ICONO_CATEGORIA));
    tagCat.appendChild(document.createTextNode(tramite.categoria ?? ''));
    detalles.appendChild(tagCat);

    // Etiqueta de cuantía
    if (tramite.cuantia) {
      const tagCuantia = crearElemento('span', 'flex items-center bg-emerald-50 border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-md border shadow-sm font-bold');
      tagCuantia.appendChild(crearIconoSVG(ICONO_EURO));
      tagCuantia.appendChild(document.createTextNode(tramite.cuantia));
      detalles.appendChild(tagCuantia);
    }

    const ef = estadoEfectivo(tramite);
    const estilo = ESTILOS_ESTADO[ef.estado] || ESTILOS_ESTADO['Desconocido'];
    const tagFecha = crearElemento('span', `flex items-center px-2.5 py-1 rounded-md border shadow-sm ${estilo.clase}`);
    tagFecha.appendChild(crearIconoSVG(ICONO_CALENDARIO));
    tagFecha.appendChild(document.createTextNode(estilo.etiqueta(tramite, ef)));
    detalles.appendChild(tagFecha);

    tarjeta.appendChild(detalles);

    if (tramite.guia && tramite.guia.que_es) {
      const botonGuia = crearElemento(
        'button',
        'text-center w-full bg-white border-2 border-emerald-600 text-emerald-700 font-bold py-2.5 px-4 rounded-xl hover:bg-emerald-50 transition-colors mb-1 flex items-center justify-center gap-2',
        '📖 Ayuda para solicitarla'
      );
      botonGuia.setAttribute('aria-label', `Ver guía de ayuda para: ${tramite.titulo}`);
      botonGuia.addEventListener('click', () => mostrarGuia(tramite));
      tarjeta.appendChild(botonGuia);
    }

    const destino = enlaceSeguro(tramite.url_oficial);
    const claseBoton = 'text-center w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl transition shadow-lg shadow-emerald-600/20';
    const boton = crearElemento(
      'a',
      destino ? `${claseBoton} hover:bg-emerald-700` : `${claseBoton} opacity-50 cursor-not-allowed`,
      'Ver en la web oficial'
    );
    boton.setAttribute('aria-label', `Ver en la web oficial: ${tramite.titulo}`);

    if (destino) {
      boton.setAttribute('href', destino);
      boton.setAttribute('target', '_blank');
      boton.setAttribute('rel', 'noopener noreferrer');
    } else {
      boton.setAttribute('aria-disabled', 'true');
    }

    tarjeta.appendChild(boton);
    contenedor.appendChild(tarjeta);
  });
}

// 5. Modal de la Guía
function mostrarGuia(tramite) {
  document.body.style.overflow = 'hidden';

  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6';
  
  const modalContent = document.createElement('div');
  modalContent.className = 'bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-2xl w-full max-h-[85vh] shadow-2xl relative flex flex-col overflow-hidden text-slate-900 dark:text-slate-100';  
  const headerHtml = `
    <div class="flex items-start justify-between p-6 pb-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
      <h2 class="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-emerald-100 leading-tight pr-4">${tramite.titulo}</h2>
      <button id="cerrar-modal" class="shrink-0 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl transition-colors shadow-sm">
          &times;
      </button>
    </div>
  `;

  let bodyHtml = `
    <div class="p-6 md:p-8 overflow-y-auto flex-1">
      <div class="text-sm text-amber-800 bg-amber-50 p-4 rounded-xl mb-6 border border-amber-200 flex items-start gap-3">
        <svg class="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        <p><strong>Aviso importante:</strong> Esta es una guía orientativa basada en fuentes públicas. Los requisitos o el método de solicitud pueden haber cambiado. Comprueba siempre los datos en la web oficial antes de presentar tu solicitud.</p>
      </div>

      <div class="space-y-6 text-slate-700 text-base">
        <div>
          <h3 class="font-bold text-lg text-emerald-700 mb-2 flex items-center gap-2">💡 ¿En qué consiste?</h3>
          <p class="leading-relaxed">${tramite.guia.que_es}</p>
        </div>
  `;

  if (tramite.guia.requisitos && tramite.guia.requisitos.length > 0) {
    bodyHtml += `
        <div>
          <h3 class="font-bold text-lg text-emerald-700 mb-2 flex items-center gap-2">✅ Requisitos principales</h3>
          <ul class="list-disc pl-5 space-y-1.5 leading-relaxed">
            ${tramite.guia.requisitos.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>
    `;
  }

  bodyHtml += `
        <div>
          <h3 class="font-bold text-lg text-emerald-700 mb-2 flex items-center gap-2">📅 Plazos</h3>
          <p class="leading-relaxed">${tramite.guia.plazos || 'Consulta los plazos exactos en la web oficial.'}</p>
        </div>
        <div>
          <h3 class="font-bold text-lg text-emerald-700 mb-2 flex items-center gap-2">📝 Cómo solicitarlo paso a paso</h3>
          <p class="leading-relaxed whitespace-pre-line">${tramite.guia.como_solicitar || 'Sigue las instrucciones de la web oficial.'}</p>
        </div>
      </div>
    </div>
  `;

  modalContent.innerHTML = headerHtml + bodyHtml;
  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);

  const cerrarModal = () => {
    modalOverlay.remove();
    document.body.style.overflow = '';
    if (history.state && history.state.modalOpen) {
        history.back();
    }
  };

  document.getElementById('cerrar-modal').addEventListener('click', cerrarModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) cerrarModal();
  });

  history.pushState({ modalOpen: true }, '');
  window.addEventListener('popstate', () => {
    if (document.body.contains(modalOverlay)) {
      modalOverlay.remove();
      document.body.style.overflow = '';
    }
  }, { once: true }); 
}

// 6. Carga inicial
async function inicializarApp() {
  const contenedor = document.getElementById('contenedor-tramites');

  try {
    const { data, error } = await clienteSupabase
      .from('tramites')
      .select('slug,titulo,categoria,estado,cuantia,fecha_apertura,fecha_cierre,proxima_apertura,apertura_estimada,destacado,url_oficial,guia')
      .eq('publicado', true);

    if (error) throw error;

    todosLosTramites = (data ?? []).sort(
      (a, b) =>
        (ORDEN_ESTADO[estadoEfectivo(a).estado] ?? 9) - (ORDEN_ESTADO[estadoEfectivo(b).estado] ?? 9) ||
        Number(b.destacado) - Number(a.destacado)
    );
    renderizarTramites(todosLosTramites);
  } catch (error) {
    console.error('Error al cargar trámites:', error.code, error.message, error.details);
    contenedor.textContent = '';
    contenedor.appendChild(
      crearElemento('p', 'text-red-500 col-span-full text-center py-8', 'Error de conexión con el portal. Inténtalo más tarde.')
    );
  }
}

// 7. Buscador en tiempo real
document.getElementById('buscador-tramites').addEventListener('input', (evento) => {
  const q = normalizar(evento.target.value);
  const filtrados = todosLosTramites.filter(
    (t) => normalizar(t.titulo).includes(q) || normalizar(t.categoria).includes(q)
  );
  renderizarTramites(filtrados);
});

// 8. Efecto Parallax del fondo
const fondoAnimado = document.getElementById('fondo-animado');
document.addEventListener('mousemove', (e) => {
  const x = (e.clientX / window.innerWidth - 0.5) * 2; 
  const y = (e.clientY / window.innerHeight - 0.5) * 2;
  if (fondoAnimado) {
    fondoAnimado.style.transform = `translate(${x * -30}px, ${y * -30}px)`;
  }
});

document.addEventListener('DOMContentLoaded', () => {
    inicializarApp();
    configurarBotonConsulta();
});

function configurarBotonConsulta() {
    const btnConsulta = document.getElementById('btn-consulta-becas');
    if (btnConsulta) {
        btnConsulta.href = URL_CONSULTA_BECAS;
    }
}

// 9. Gestión del Tema Oscuro/Claro
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const iconSun = document.getElementById('icon-sun');
    const iconMoon = document.getElementById('icon-moon');

    // Función para aplicar el tema
    const applyTheme = (isDark) => {
        if (isDark) {
            document.documentElement.classList.add('dark');
            iconSun.classList.remove('hidden');
            iconMoon.classList.add('hidden');
        } else {
            document.documentElement.classList.remove('dark');
            iconSun.classList.add('hidden');
            iconMoon.classList.remove('hidden');
        }
    };

    // 1. Comprobar preferencia del sistema al cargar
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    // 2. Comprobar si el usuario ya había elegido un tema antes (localStorage)
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        applyTheme(true);
    } else {
        applyTheme(false);
    }

    // 3. Escuchar el clic del botón
    themeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.classList.contains('dark');
        applyTheme(!isDark);
        // Guardar la preferencia del usuario
        localStorage.setItem('theme', !isDark ? 'dark' : 'light');
    });
});