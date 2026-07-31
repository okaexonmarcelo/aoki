# Aoki — Agente conversacional de Oka

Aoki es el agente conversacional inteligente de **Oka (IH Fintech S.A.)**, construido sobre **Claude API (Anthropic)**. Guía al usuario desde el ingreso de su DNI hasta el desembolso de su crédito, orquestando las APIs existentes de Oka de forma autónoma.

---

## Estructura del repositorio

```
aoki/
├── backend/                        ← Microservicio Node.js (el agente)
│   ├── server.js                   ← Entry point
│   ├── src/
│   │   ├── agent/
│   │   │   ├── orchestrator.js     ← Lógica Claude API + tool calling
│   │   │   ├── prompts.js          ← System prompt de Aoki
│   │   │   └── tools/
│   │   │       ├── leads.tool.js   ← Consulta línea preaprobada
│   │   │       ├── seguros.tool.js ← Simula seguros Vida Plus / Desempleo
│   │   │       └── sales.tool.js   ← Convierte lead a loan
│   │   └── routes/
│   │       └── chat.routes.js      ← Endpoint POST /chat
│   ├── package.json
│   └── .env.example
│
├── widget/                         ← JS que se embebe en Webflow
│   ├── aoki-widget.js              ← Código fuente (IIFE autocontenido)
│   └── aoki-widget.min.js          ← Versión minificada para producción
│
├── demo/                           ← Página HTML para demo interna
│   └── index.html                  ← Simula oka.com.pe con el widget
│
├── docs/                           ← Documentación del proyecto
│   ├── AOKI_CONTEXTO_MVP.md        ← Contexto completo (usar con Claude)
│   └── flujo.md                    ← Diagrama del flujo del agente
│
├── .gitignore
└── README.md
```

---

## Requisitos previos

- Node.js >= 18
- npm >= 9
- Cuenta en [Anthropic](https://console.anthropic.com) con acceso a Claude API
- API key de Oka (`OKA_API_KEY`) — solicitarla al equipo de backend

---

## Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/oka-fintech/aoki.git
cd aoki

# 2. Instalar dependencias del backend
cd backend
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus keys (ver sección Variables de entorno)
```

---

## Variables de entorno

Crear el archivo `backend/.env` basándose en `backend/.env.example`:

```env
# Anthropic — Claude API
ANTHROPIC_API_KEY=sk-ant-...

# Oka — APIs internas
OKA_API_KEY=tu-token-oka

# Servidor
PORT=3000

# CORS — origen permitido (en desarrollo usar *)
CORS_ORIGIN=https://www.oka.com.pe
```

> ⚠️ Nunca subas `.env` al repositorio. Está en `.gitignore`.

---

## Arrancar en desarrollo

```bash
# Desde la carpeta backend/
cd backend
npm run dev

# Output esperado:
# Aoki backend corriendo en :3000
```

Para probar el agente sin el widget, usar Postman o curl:

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      { "role": "user", "content": "Hola, mi DNI es 45678912" }
    ]
  }'
```

Respuesta esperada:

```json
{
  "reply": "¡Hola! Revisando tu perfil... 🎉 ¡Tienes un crédito preaprobado de hasta S/ 3,500! ¿Qué producto necesitas hoy: Crédito Oka o Efectivo Oka?"
}
```

---

## Probar la demo en el navegador

```bash
# Opción 1: abrir directamente (no requiere servidor)
open demo/index.html

# Opción 2: servir con un servidor estático simple
npx serve demo/
# → http://localhost:3000
```

> Asegúrate de que el backend esté corriendo antes de abrir la demo.

---

## APIs que orquesta Aoki

Aoki tiene acceso a tres herramientas (tools) que llaman a las APIs existentes de Oka:

| Tool                    | Endpoint                   | Descripción                                     |
| ----------------------- | -------------------------- | ----------------------------------------------- |
| `consultar_leads`       | `POST /v1/leads/check`     | Verifica si el DNI tiene línea preaprobada      |
| `simular_seguro`        | `POST /v1/seguros/simular` | Calcula cuota con seguros Vida Plus / Desempleo |
| `convertir_lead_a_loan` | `POST /v1/sales/convert`   | Convierte el lead en loan y activa onboarding   |

Ver documentación completa de las APIs en `docs/AOKI_CONTEXTO_MVP.md`.

---

## Flujo del agente

```
Usuario ingresa DNI
       ↓
[TOOL] consultar_leads(dni)
       ↓
¿Tiene línea?
  ├── NO  → Mensaje amable → FIN
  └── SÍ  → Muestra oferta preaprobada
               ↓
             Usuario elige producto + monto + plazo
               ↓
             [TOOL] simular_seguro(monto, plazo)
               ↓
             Muestra cuota + seguros opcionales
               ↓
             Usuario confirma
               ↓
             [TOOL] convertir_lead_a_loan(...)
               ↓
             Redirige a onboarding → "Crear cuenta para desembolsar"
```

---

## Integración en Webflow

Una vez el backend esté desplegado, pegar esta línea en:
**Webflow → Settings → Custom Code → Footer Code**

```html
<script src="https://agent.oka.com.pe/aoki-widget.js" defer></script>
```

El widget aparecerá como un botón flotante en la esquina inferior derecha de todas las páginas de oka.com.pe.

---

## Deploy en producción

### Backend — Railway.app

```bash
# 1. Instalar Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Crear proyecto
cd backend
railway init

# 4. Configurar variables de entorno en Railway
railway variables set ANTHROPIC_API_KEY=sk-ant-...
railway variables set OKA_API_KEY=tu-token-oka
railway variables set CORS_ORIGIN=https://www.oka.com.pe

# 5. Deploy
railway up

# Output: https://aoki-backend.railway.app
```

### Widget — servir como archivo estático

El archivo `widget/aoki-widget.min.js` puede servirse desde:

- **S3 + CloudFront** (recomendado para producción en AWS)
- **Railway** junto con el backend como archivos estáticos
- **Cualquier CDN**

```bash
# Minificar el widget antes de subir
npx terser widget/aoki-widget.js -o widget/aoki-widget.min.js --compress --mangle
```

---

## Plan MVP — 4 semanas

| Semana | Objetivo                              | Entregable                                  |
| ------ | ------------------------------------- | ------------------------------------------- |
| **1**  | Backend + Claude API + API Leads      | `POST /chat` responde con línea preaprobada |
| **2**  | APIs Seguros + Sales + flujo completo | Conversación end-to-end en Postman          |
| **3**  | Widget embebido + UI en navegador     | Página demo funcional en local              |
| **4**  | Pulido + deploy + demo                | URL pública lista para presentar            |

Ver plan detallado día a día en `docs/AOKI_CONTEXTO_MVP.md`.

---

## Brand Oka

| Token               | Valor     | Uso                           |
| ------------------- | --------- | ----------------------------- |
| `--oka-green`       | `#C8E63C` | Color primario, CTAs, botones |
| `--oka-navy`        | `#0A0A2E` | Headers, fondos oscuros       |
| `--oka-green-dark`  | `#3B6D11` | Texto sobre verde lima        |
| `--oka-green-light` | `#F4FAD4` | Fondos de badges de éxito     |

---

## Decisiones técnicas

**¿Por qué un solo repo?**
Un solo desarrollador en MVP. Separar repos agrega fricción sin beneficio. Se puede migrar a repos independientes cuando escale el equipo.

**¿Por qué IIFE en el widget?**
Para no contaminar el scope global de Webflow ni interferir con otros scripts del CMS.

**¿Por qué HTTP simple y no WebSockets en el MVP?**
HTTP es suficiente para la demo. WebSockets se agrega en la siguiente iteración para streaming de respuestas en tiempo real.

**¿Por qué Railway y no AWS para el MVP?**
Deploy en segundos con `git push`, gratis en el tier inicial, sin configuración de ECS/ECR. Se migra a AWS ECS cuando el proyecto pase a producción real.

**¿Qué es TTL 24h en DynamoDB?**
Time To Live — expiración automática de registros de sesión. Las sesiones de conversación se eliminan solas a las 24 horas. Los logs de auditoría no tienen TTL por compliance SBS. (DynamoDB se agrega post-MVP.)

---

## Contexto para Claude

El archivo `docs/AOKI_CONTEXTO_MVP.md` contiene el contexto completo del proyecto. Para continuar el desarrollo en una nueva sesión de Claude, adjuntar ese archivo al inicio del chat.

---

## Licencia

Uso interno — IH Fintech S.A. © 2026. Documento confidencial.
