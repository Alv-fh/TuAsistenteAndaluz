import dotenv from 'dotenv';
dotenv.config();

// Base de los trámites de protección por desempleo en la Sede Electrónica del SEPE.
// OJO: la sede está en sede.sepe.gob.es (dominio distinto de sepe.es).
const SEDE_SEPE = 'https://sede.sepe.gob.es/portalSede/procedimientos-y-servicios/personas/proteccion-por-desempleo/';

export const config = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
  },
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN,
    adminChatId: process.env.TELEGRAM_CHAT_ID,
  },
  crawler: {
    headless: process.env.HEADLESS === 'true',
    dominiosPermitidos: ['juntadeandalucia.es', 'boe.es', 'sepe.es', 'sepe.gob.es'],

    // Propiedades de control (las que faltaban)
    segmentosGenericos: ['convocatorias', 'calendario', 'normativa', 'preguntas-frecuentes', 'solicitud', 'inicio', 'index'],
    maxCaracteresFuente: 15000,
    mesesMaxCerrada: 12,

    // --- CONFIGURACIÓN DE LA ARAÑA (CRAWLER) ---
    portadas: [
      'https://www.juntadeandalucia.es/temas/estudiar/becas.html',
      'https://www.juntadeandalucia.es/organismos/empleoempresaytrabajoautonomo/areas/empleo.html',
      'https://www.juntadeandalucia.es/temas/familias-igualdad/mayores/ayudas.html',
      'https://www.juntadeandalucia.es/temas/familias-igualdad/discapacidad/ayudas-beneficios.html',
      'https://www.juntadeandalucia.es/organismos/universidadindustriaenergiaeinnovacion/areas/universidad/talento.html',
      'https://www.sepe.es/HomeSepe/prestaciones-desempleo/',
      'https://sede.sepe.gob.es/portalSede/procedimientos-y-servicios/personas/proteccion-por-desempleo/solicitud-de-prestaciones.html'
    ],
    urlsDirectas: [
      {
        url: 'https://www.juntadeandalucia.es/educacion/portales/becas-ayudas/becas/beca-6000',
        slug: 'beca-6000',
        categoria: 'Educación',
        fuentes: [
          'https://www.juntadeandalucia.es/educacion/portales/becas-ayudas/becas/beca-6000',
          'https://www.juntadeandalucia.es/educacion/portales/web/educacion/becas-ayudas/becas/beca-6000/convocatorias'
        ]
      },
      //  Ayuda al Transporte
      {
        url: 'https://www.juntadeandalucia.es/educacion/portales/becas-ayudas/ayudas/ayuda-transporte',
        slug: 'ayuda-transporte',
        categoria: 'Educación',
        fuentes: [
          'https://www.juntadeandalucia.es/educacion/portales/becas-ayudas/ayudas/ayuda-transporte'
        ]
      },
      //  Programa Emplea-T (Empleo)
      {
        url: 'https://www.juntadeandalucia.es/organismos/empleoempresaytrabajoautonomo/areas/empleo/incentivos-contratacion/paginas/empleat.html',
        slug: 'programa-emplea-t',
        categoria: 'Empleo',
        fuentes: ['https://www.juntadeandalucia.es/organismos/empleoempresaytrabajoautonomo/areas/empleo/incentivos-contratacion/paginas/empleat.html']
      },
      {
        url: 'https://www.juntadeandalucia.es/servicios/sede/tramites/procedimientos/detalle/24974.html',
        slug: 'bono-alquiler-joven',
        categoria: 'Vivienda',
        fuentes: ['https://www.juntadeandalucia.es/servicios/sede/tramites/procedimientos/detalle/24974.html']
      },
      {
        url: 'https://www.juntadeandalucia.es/servicios/sede/tramites/procedimientos/detalle/25586.html',
        slug: 'ayuda-comedor-escolar',
        categoria: 'Educación',
        fuentes: ['https://www.juntadeandalucia.es/servicios/sede/tramites/procedimientos/detalle/25586.html']
      },
      {
        url: 'https://www.juntadeandalucia.es/medioambiente/portal/web/caza-y-pesca/licencias-tasas/licencias-caza-pesca',
        slug: 'licencia-caza-pesca',
        categoria: 'Medio Ambiente',
        // Antes aquí había una URL de relleno ("/.../licencia-caza-pesca.html") que no existe
        // y hacía fallar la lectura de fuentes. Ahora se lee la propia página.
        fuentes: ['https://www.juntadeandalucia.es/medioambiente/portal/web/caza-y-pesca/licencias-tasas/licencias-caza-pesca']
      },
      // Garantía Vivienda Andalucía (Aval Jóvenes)
      {
        url: 'https://www.juntadeandalucia.es/organismos/viviendajuventudyordenaciondelterritorio/areas/vivienda-rehabilitacion/programa-garantia-vivienda.html',
        slug: 'garantia-vivienda-andalucia',
        categoria: 'Vivienda',
        fuentes: [
          'https://www.juntadeandalucia.es/organismos/viviendajuventudyordenaciondelterritorio/areas/vivienda-rehabilitacion/programa-garantia-vivienda.html',
          'https://www.juntadeandalucia.es/servicios/sede/tramites/procedimientos/detalle/25368.html'
        ]
      },
      // Ayudas Sociales Extraordinarias 2026
      {
        url: 'https://www.juntadeandalucia.es/organismos/serviciossocialesfamiliaseigualdad/areas/pensiones/extraordinarias.html',
        slug: 'ayudas-sociales-extraordinarias-2026',
        categoria: 'Ayudas',
        fuentes: [
          'https://www.juntadeandalucia.es/organismos/serviciossocialesfamiliaseigualdad/areas/pensiones/extraordinarias.html',
          'https://www.juntadeandalucia.es/boja/2025/246/11',
          'https://www.juntadeandalucia.es/boja/2025/246/12'
        ]
      },
      // Tarjeta Sanitaria
      {
        url: 'https://www.juntadeandalucia.es/temas/salud/servicios/tarjeta.html',
        slug: 'tarjeta-sanitaria',
        categoria: 'Trámites',
        fuentes: [
          'https://www.juntadeandalucia.es/temas/salud/servicios/tarjeta.html',
          'https://www.sspa.juntadeandalucia.es/servicioandaluzdesalud/ciudadania/gestiones-administrativas'
        ]
      },

      // ---------- NUEVOS: Junta de Andalucía ----------
      // Programa Activa-T Joven. Ojo: los beneficiarios son los AYUNTAMIENTOS; los jóvenes
      // (18-29, Garantía Juvenil) son las personas contratadas. El plazo de 2025 acabó el 17/11/2025.
      {
        url: 'https://www.juntadeandalucia.es/organismos/empleoempresaytrabajoautonomo/areas/empleo/incentivos-contratacion/paginas/programa-activat-joven.html',
        slug: 'programa-activa-t-joven',
        categoria: 'Empleo',
        fuentes: [
          'https://www.juntadeandalucia.es/organismos/empleoempresaytrabajoautonomo/areas/empleo/incentivos-contratacion/paginas/programa-activat-joven.html'
        ]
      },

      // ---------- NUEVOS: SEPE (solo páginas de la Sede Electrónica, sede.sepe.gob.es) ----------
      {
        url: SEDE_SEPE + 'reconocimiento-prestacion-contributiva.html',
        slug: 'prestacion-contributiva-desempleo',
        categoria: 'Empleo',
        fuentes: [SEDE_SEPE + 'reconocimiento-prestacion-contributiva.html']
      },
      {
        url: SEDE_SEPE + 'solicitud-de-prestaciones.html',
        slug: 'solicitud-prestaciones-subsidios-desempleo',
        categoria: 'Empleo',
        fuentes: [SEDE_SEPE + 'solicitud-de-prestaciones.html']
      },
      {
        url: SEDE_SEPE + 'reconocimiento-prorroga-subsidios.html',
        slug: 'prorroga-subsidio-desempleo',
        categoria: 'Empleo',
        fuentes: [SEDE_SEPE + 'reconocimiento-prorroga-subsidios.html']
      },
      {
        url: SEDE_SEPE + 'declaracion-anual-subsidio-mayores-52.html',
        slug: 'declaracion-anual-subsidio-mayores-52',
        categoria: 'Empleo',
        fuentes: [SEDE_SEPE + 'declaracion-anual-subsidio-mayores-52.html']
      },
      {
        url: SEDE_SEPE + 'obtencion-de-certificados.html',
        slug: 'certificado-prestaciones-sepe',
        categoria: 'Trámites',
        fuentes: [SEDE_SEPE + 'obtencion-de-certificados.html']
      },
      {
        url: SEDE_SEPE + 'cita-previa.html',
        slug: 'cita-previa-sepe',
        categoria: 'Trámites',
        fuentes: [SEDE_SEPE + 'cita-previa.html']
      },
      // Área Personal: presolicitud, desistimiento y cambio de datos bancarios (solo se hacen ahí)
      {
        url: SEDE_SEPE + 'area-personal.html',
        slug: 'area-personal-sepe',
        categoria: 'Trámites',
        fuentes: [SEDE_SEPE + 'area-personal.html']
      }
      // Otras páginas de la sede que podrías añadir más adelante:
      //   baja-prestacion.html, consultas.html, comunicacion-variacion-situacion-personal-familiar-rentas.html,
      //   gestion-documentacion-ciudadano.html
    ],
    ignorarSlugs: ['tu-beca-en-nueve-pasos'],
    maxProfundidad: 2,
    // Subido de 25 a 40: las urlsDirectas ya son 17 y con 25 apenas quedaría margen
    // para las páginas que la IA descubre a partir de las portadas.
    maxPaginas: 40,
    maxEnlacesPorPagina: 6,
    maxCaracteresIa: 30000,
    palabrasClave: /beca|ayuda|subvenci|bono|matr[ií]cula|escolariza|admisi[oó]n/i,

    // --- CONFIGURACIÓN DE LOS BOLETINES (BULLETINS) ---
    bojaFeedUrl: 'https://www.juntadeandalucia.es/boja/distribucion/boja.xml',
    boeDiasAtras: 3,
    maxAnalisisBoletines: 15
  }
}