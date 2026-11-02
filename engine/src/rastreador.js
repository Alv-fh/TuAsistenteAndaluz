import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();
chromium.use(stealthPlugin());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Apuntamos directamente a la convocatoria del Bono Alquiler Joven
const URLS_BOJA = [
  'https://www.juntadeandalucia.es/organismos/fomentoarticulaciondelterritorioyvivienda/areas/vivienda-rehabilitacion/fomento-alquiler/paginas/bonojoven.html'
];

async function iniciarRastreoBoja() {
  console.log("🚀 Buscando nuevas ayudas ciudadanas...");
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  let textoSumario = "";

  try {
    for (const url of URLS_BOJA) {
      console.log(`🌐 Leyendo texto oficial: ${url}`);
      
      // CAMBIO 1: Esperamos a que no haya más conexiones de red (networkidle)
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      
      // CAMBIO 2: Le damos 2 segundos extra de pausa para que termine de pintar el texto real
      await page.waitForTimeout(2000); 
      
      textoSumario = await page.evaluate(() => document.body.innerText);
      console.log(`   ✔ Extraídos ${textoSumario.length} caracteres.`);
    }
  } catch (error) {
    console.error("⚠️ Error rastreando la web:", error.message);
  } finally {
    await browser.close();
  }

  if (textoSumario.length > 0) {
    await analizarNovedadesBoja(textoSumario);
  }
}
async function analizarNovedadesBoja(texto) {
  console.log("🧠 Analizando el texto para extraer requisitos y redactar la guía...");
  const modelo = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

  const prompt = `
    Eres un analista experto del Boletín Oficial de la Junta de Andalucía (BOJA).
    Tu objetivo es leer este texto masivo y detectar ÚNICAMENTE ayudas, becas, subvenciones directas a ciudadanos o bolsas de empleo relevantes.

    Si encuentras una ayuda relevante, extrae la información y genera un JSON estricto. Si no hay NADA relevante, devuelve {}.

    Estructura JSON requerida (solo si encuentras una ayuda):
    {
      "slug": "generar-slug-unico-ej-bono-alquiler-joven",
      "titulo": "Nombre oficial de la ayuda detectada",
      "categoria": "Educación, Empleo, Vivienda o Ayudas",
      "estado": "Abierto",
      "fecha_cierre": "Calcula la fecha de fin de plazo si se menciona, si no, pon 'Consultar'",
      "destacado": true,
      "publicado": false,
      "url_oficial": "https://www.juntadeandalucia.es/organismos...",
      "guia_html": "REDACTA AQUÍ UNA GUÍA EN HTML. Usa SÓLO: <h3>, <p>, <ul>, <li>, <strong>, <a href='...'>. NADA de markdown.\\n\\n1. <h3>¿Qué es esta nueva ayuda?</h3> <p>Explicación sencilla.</p>\\n2. <h3>Requisitos principales</h3> <ul>...</ul>\\n3. <h3>Plazos detectados</h3> <p>...</p>\\n4. <h3>Cómo solicitarlo</h3> <p>Pasos mencionados y enlaces a PDFs.</p>"
    }

    Texto a analizar:
    ${texto}
  `;

  try {
    const respuesta = await modelo.generateContent(prompt);
    let textoJSON = respuesta.response.text();
    textoJSON = textoJSON.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const datos = JSON.parse(textoJSON);

    if (Object.keys(datos).length === 0) {
      console.log("ℹ️ No se han encontrado nuevas ayudas relevantes para ciudadanos.");
      return;
    }

    console.log(`📦 ¡Ayuda detectada y procesada!: ${datos.titulo}`);
    await guardarEnBaseDeDatos(datos);

  } catch (error) {
    console.error("❌ Error de la IA al analizar el texto:", error);
  }
}

async function guardarEnBaseDeDatos(datos) {
  console.log("💾 Guardando el nuevo trámite en Supabase (En Cuarentena)...");
  const { error } = await supabase.from('tramites').upsert(datos, { onConflict: 'slug' });
  
  if (error) {
    console.error("❌ Error en Supabase:", error.message);
  } else {
    console.log("✅ ¡Nuevo trámite guardado correctamente en borradores!");
  }
}

iniciarRastreoBoja();