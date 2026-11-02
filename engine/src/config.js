import dotenv from 'dotenv';
dotenv.config();

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
    dominiosPermitidos: ['juntadeandalucia.es', 'boe.es'],

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
      'https://www.juntadeandalucia.es/organismos/universidadindustriaenergiaeinnovacion/areas/universidad/talento.html'
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
      fuentes: ['https://www.juntadeandalucia.es/.../licencia-caza-pesca.html']
      }
    ],
    ignorarSlugs: ['tu-beca-en-nueve-pasos'],
    maxProfundidad: 2,
    maxPaginas: 25,
    maxEnlacesPorPagina: 6,
    maxCaracteresIa: 30000,
    palabrasClave: /beca|ayuda|subvenci|bono|matr[ií]cula|escolariza|admisi[oó]n/i,

    // --- CONFIGURACIÓN DE LOS BOLETINES (BULLETINS) ---
    bojaFeedUrl: 'https://www.juntadeandalucia.es/boja/distribucion/boja.xml',
    boeDiasAtras: 3,
    maxAnalisisBoletines: 15
  }
}