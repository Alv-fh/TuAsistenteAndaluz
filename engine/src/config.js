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
    dominiosPermitidos: ['juntadeandalucia.es', 'boe.es', 'sepe.es', 'seg-social.es', 'prestaciones.seg-social.es', 'sede.agenciatributaria.gob.es'],
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
      'https://sede.sepe.gob.es/portalSede/procedimientos-y-servicios/personas/proteccion-por-desempleo/solicitud-de-prestaciones.html',
      'https://www.juntadeandalucia.es/temas/familias-igualdad/discapacidad/ayudas-beneficios/otras-ayudas.html'
    ],
      urlsDirectas: [
      // Beca 6000
      {
        url: 'https://www.juntadeandalucia.es/educacion/portales/becas-ayudas/becas/beca-6000',
        slug: 'beca-6000',
        categoria: 'Educación',
        fuentes: [
          'https://www.juntadeandalucia.es/educacion/portales/becas-ayudas/becas/beca-6000',
          'https://www.juntadeandalucia.es/educacion/portales/web/educacion/becas-ayudas/becas/beca-6000/convocatorias'
        ]
      },
      // Ayuda al Transporte
      {
        url: 'https://www.juntadeandalucia.es/educacion/portales/becas-ayudas/ayudas/ayuda-transporte',
        slug: 'ayuda-transporte',
        categoria: 'Educación',
        fuentes: [
          'https://www.juntadeandalucia.es/educacion/portales/becas-ayudas/ayudas/ayuda-transporte'
        ]
      },
      // Programa Emplea-T
      {
        url: 'https://www.juntadeandalucia.es/organismos/empleoempresaytrabajoautonomo/areas/empleo/incentivos-contratacion/paginas/empleat.html',
        slug: 'programa-emplea-t',
        categoria: 'Empleo',
        fuentes: ['https://www.juntadeandalucia.es/organismos/empleoempresaytrabajoautonomo/areas/empleo/incentivos-contratacion/paginas/empleat.html']
      },
      // Bono Alquiler Joven
      {
        url: 'https://www.juntadeandalucia.es/servicios/sede/tramites/procedimientos/detalle/24974.html',
        slug: 'bono-alquiler-joven',
        categoria: 'Vivienda',
        fuentes: ['https://www.juntadeandalucia.es/servicios/sede/tramites/procedimientos/detalle/24974.html']
      },
      // Ayuda al Comedor Escolar
      {
        url: 'https://www.juntadeandalucia.es/servicios/sede/tramites/procedimientos/detalle/25586.html',
        slug: 'ayuda-comedor-escolar',
        categoria: 'Educación',
        fuentes: ['https://www.juntadeandalucia.es/servicios/sede/tramites/procedimientos/detalle/25586.html']
      },
      // Licencia de Caza y Pesca
      {
        url: 'https://www.juntadeandalucia.es/medioambiente/portal/web/caza-y-pesca/licencias-tasas/licencias-caza-pesca',
        slug: 'licencia-caza-pesca',
        categoria: 'Medio Ambiente',
        fuentes: ['https://www.juntadeandalucia.es/medioambiente/portal/web/caza-y-pesca/licencias-tasas/licencias-caza-pesca']
      },
      // Garantía Vivienda Andalucía
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
      // Programa Activa-T Joven
      {
        url: 'https://www.juntadeandalucia.es/organismos/empleoempresaytrabajoautonomo/areas/empleo/incentivos-contratacion/paginas/programa-activat-joven.html',
        slug: 'programa-activa-t-joven',
        categoria: 'Empleo',
        fuentes: [
          'https://www.juntadeandalucia.es/organismos/empleoempresaytrabajoautonomo/areas/empleo/incentivos-contratacion/paginas/programa-activat-joven.html'
        ]
      },
      // Prestación Contributiva por Desempleo (SEPE)
      {
        url: SEDE_SEPE + 'reconocimiento-prestacion-contributiva.html',
        slug: 'prestacion-contributiva-desempleo',
        categoria: 'Empleo',
        fuentes: [SEDE_SEPE + 'reconocimiento-prestacion-contributiva.html']
      },
      // Solicitud de Prestaciones y Subsidios (SEPE)
      {
        url: SEDE_SEPE + 'solicitud-de-prestaciones.html',
        slug: 'solicitud-prestaciones-subsidios-desempleo',
        categoria: 'Empleo',
        fuentes: [SEDE_SEPE + 'solicitud-de-prestaciones.html']
      },
      // Prórroga de Subsidio por Desempleo (SEPE)
      {
        url: SEDE_SEPE + 'reconocimiento-prorroga-subsidios.html',
        slug: 'prorroga-subsidio-desempleo',
        categoria: 'Empleo',
        fuentes: [SEDE_SEPE + 'reconocimiento-prorroga-subsidios.html']
      },
      // Declaración Anual de Rentas (Subsidio Mayores 52)
      {
        url: SEDE_SEPE + 'declaracion-anual-subsidio-mayores-52.html',
        slug: 'declaracion-anual-subsidio-mayores-52',
        categoria: 'Empleo',
        fuentes: [SEDE_SEPE + 'declaracion-anual-subsidio-mayores-52.html']
      },
      // Certificado de Prestaciones (SEPE)
      {
        url: SEDE_SEPE + 'obtencion-de-certificados.html',
        slug: 'certificado-prestaciones-sepe',
        categoria: 'Trámites',
        fuentes: [SEDE_SEPE + 'obtencion-de-certificados.html']
      },
      // Cita Previa SEPE
      {
        url: SEDE_SEPE + 'cita-previa.html',
        slug: 'cita-previa-sepe',
        categoria: 'Trámites',
        fuentes: [SEDE_SEPE + 'cita-previa.html']
      },
      // Área Personal SEPE
      {
        url: SEDE_SEPE + 'area-personal.html',
        slug: 'area-personal-sepe',
        categoria: 'Trámites',
        fuentes: [SEDE_SEPE + 'area-personal.html']
      },
      // Ingreso Mínimo Vital (IMV)
      {
        url: 'https://imv.seg-social.es/',
        slug: 'ingreso-minimo-vital',
        categoria: 'Ayudas',
        fuentes: ['https://imv.seg-social.es/']
      },
      // Prestación Económica de Asistencia Personal
      {
        url: 'https://www.juntadeandalucia.es/agenciadeserviciossocialesydependencia/index.php/m-dependencia/158-prestacion-economica-de-asistencia-personal-2',
        slug: 'prestacion-asistencia-personal',
        categoria: 'Ayudas',
        fuentes: ['https://www.juntadeandalucia.es/agenciadeserviciossocialesydependencia/index.php/m-dependencia/158-prestacion-economica-de-asistencia-personal-2']
      },
      // Prestación Familiar por Hijo con Discapacidad
      {
        url: 'https://prestaciones.seg-social.es/servicio/prestacion-familiar-cuidado-hijos-discapacidad.html',
        slug: 'prestacion-familiar-hijo-discapacidad',
        categoria: 'Ayudas',
        fuentes: ['https://prestaciones.seg-social.es/servicio/prestacion-familiar-cuidado-hijos-discapacidad.html']
      },
      // Prestación por Nacimiento (Pago Único)
      {
        url: 'https://prestaciones.seg-social.es/servicio/prestacion-pago-unico-nacimiento-adopcion-familias-monoparentales.html',
        slug: 'prestacion-nacimiento-pago-unico',
        categoria: 'Ayudas',
        fuentes: ['https://prestaciones.seg-social.es/servicio/prestacion-pago-unico-nacimiento-adopcion-familias-monoparentales.html']
      },
      // Prestación Ortoprotésica (SAS)
      {
        url: 'https://www.sspa.juntadeandalucia.es/servicioandaluzdesalud/profesionales/recursos-para-profesionales/prestacion-ortoprotesica',
        slug: 'prestacion-ortoprotesica',
        categoria: 'Ayudas',
        fuentes: ['https://www.sspa.juntadeandalucia.es/servicioandaluzdesalud/profesionales/recursos-para-profesionales/prestacion-ortoprotesica']
      },
      // Patrimonios Protegidos y Previsión Social (Discapacidad)
      {
        url: 'https://sede.agenciatributaria.gob.es/Sede/ciudadanos-familias-personas-discapacidad/patrimonios-protegidos-prevision-social-personas-discapacidad.html',
        slug: 'patrimonio-protegido-discapacidad',
        categoria: 'Ayudas',
        fuentes: ['https://sede.agenciatributaria.gob.es/Sede/ciudadanos-familias-personas-discapacidad/patrimonios-protegidos-prevision-social-personas-discapacidad.html']
      },
      // Exención del Impuesto de Matriculación (Discapacidad)
      {
        url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GZ17.shtml',
        slug: 'exencion-impuesto-matriculacion-discapacidad',
        categoria: 'Trámites',
        fuentes: ['https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GZ17.shtml']
      },
      // Prestación por Desempleo (Seguridad Social)
      {
        url: 'https://www.seg-social.es/wps/portal/wss/internet/InformacionUtil/44539/49706?changeLanguage=es',
        slug: 'prestacion-desempleo-seguridad-social',
        categoria: 'Empleo',
        fuentes: ['https://www.seg-social.es/wps/portal/wss/internet/InformacionUtil/44539/49706?changeLanguage=es']
      }
      // Otras páginas de la sede que podrías añadir más adelante:
      //   baja-prestacion.html, consultas.html, comunicacion-variacion-situacion-personal-familiar-rentas.html,
      //   gestion-documentacion-ciudadano.html
    ],
    ignorarSlugs: ['tu-beca-en-nueve-pasos', 'nacionales', 'otras-ayudas'],
    maxProfundidad: 2,
    // Subido de 25 a 40: las urlsDirectas ya son 17 y con 25 apenas quedaría margen
    // para las páginas que la IA descubre a partir de las portadas.
    maxPaginas: 40,
    maxEnlacesPorPagina: 6,
    maxCaracteresIa: 30000,
    palabrasClave: /beca|ayuda|subvenci|bono|matr[ií]cula|escolariza|admisi[oó]n|discapacidad|empleo|transporte|comedor|vivienda|alquiler|mayores|dependencia|paro|subsidio|sepe|tasa|licencia/i,
    // --- CONFIGURACIÓN DE LOS BOLETINES (BULLETINS) ---
    bojaFeedUrl: 'https://www.juntadeandalucia.es/boja/distribucion/boja.xml',
    boeDiasAtras: 3,
    maxAnalisisBoletines: 15
  }
}