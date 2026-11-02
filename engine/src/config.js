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
    
    // --- CONFIGURACIÓN DE LA ARAÑA (CRAWLER) ---
    portadas: ['https://www.juntadeandalucia.es/temas/estudiar/becas.html'],
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
      {
        url: 'https://www.juntadeandalucia.es/servicios/sede/tramites/procedimientos/detalle/24974.html',
        slug: 'bono-alquiler-joven',
        categoria: 'Vivienda',
        fuentes: ['https://www.juntadeandalucia.es/servicios/sede/tramites/procedimientos/detalle/24974.html']
      }
    ],
    ignorarSlugs: [],
    maxProfundidad: 2,
    maxPaginas: 20,
    maxEnlacesPorPagina: 6,
    maxCaracteresIa: 30000,
    palabrasClave: /beca|ayuda|subvenci|bono|matr[ií]cula|escolariza|admisi[oó]n/i,

    // --- CONFIGURACIÓN DE LOS BOLETINES (BULLETINS) ---
    bojaFeedUrl: 'https://www.juntadeandalucia.es/boja/distribucion/boja.xml',
    boeDiasAtras: 3,
    maxAnalisisBoletines: 15
  }
};