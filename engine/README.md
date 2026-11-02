# TuAsistenteAndaluz 🏛️

**TuAsistenteAndaluz** es una plataforma que rastrea, analiza y simplifica las ayudas, becas y trámites oficiales de la Junta de Andalucía. Utiliza Inteligencia Artificial para explicar los requisitos en lenguaje humano y avisa al administrador vía Telegram antes de publicar cualquier contenido.

## 🚀 Características

- **Rastreador Automático:** Busca nuevas ayudas en portales oficiales y en el BOE/BOJA.
- **Análisis con IA:** Usa Gemini para filtrar ayudas reales, extraer fechas y redactar guías paso a paso.
- **Aprobación por Telegram:** Recibe alertas en tu móvil y decide qué se publica con un solo botón.
- **Frontend Moderno:** Interfaz con estilo *Liquid Glass* (Tailwind CSS), buscador en tiempo real y modales interactivos.
- **Base de Datos Segura:** Alojada en Supabase con políticas RLS.

## 🛠️ Tecnologías

- **Backend:** Node.js (ES Modules)
- **Scraping:** Playwright + Stealth Plugin
- **IA:** Google Gemini API (`@google/genai`)
- **Base de Datos:** Supabase (PostgreSQL)
- **Notificaciones:** Telegram Bot API
- **Frontend:** HTML5, Tailwind CSS, JavaScript Vanilla

## 📂 Estructura del Proyecto

```text
motor-asistente/
├── public/                 # Frontend (HTML, CSS, JS)
├── engine/                 # Backend y Motor de Scraping
│   ├── src/
│   │   ├── config.js       # Configuración global
│   │   ├── crawler.js      # Rastreador de portales
│   │   ├── bulletins.js    # Lector del BOE/BOJA
│   │   ├── updater.js      # Actualizador de trámites existentes
│   │   ├── bot.js          # Escuchador de Telegram
│   │   └── lib/            # Módulos auxiliares (DB, IA, Browser, Telegram)
│   └── .env                # Variables de entorno (NO SUBIR)
└── README.md