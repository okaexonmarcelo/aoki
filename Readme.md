# Aoki — Agente conversacional de Oka

Aoki es el agente conversacional inteligente de **Oka (IH Fintech S.A.)**, construido sobre **Groq (modelo `openai/gpt-oss-120b`)**. Guía al usuario desde el ingreso de su DNI hasta el desembolso de su crédito, orquestando las APIs existentes de Oka de forma autónoma.

Backend en **TypeScript** (Express) y widget embebible en **React + TypeScript** (Vite), compilado a un único archivo IIFE.

---

## Estructura del repositorio

```
aoki/
├── backend/                        ← Microservicio Node.js + TypeScript (el agente)
│   ├── src/
│   │   ├── server.ts                ← Entry point
│   │   ├── config/
│   │   │   └── env.ts               ← Validación de variables de entorno (zod)
│   │   ├── agent/
│   │   │   ├── orchestrator.ts      ← Lógica Groq API + tool calling
│   │   │   ├── prompts.ts           ← System prompt de Aoki
│   │   │   └── tools/
│   │   │       ├── tool.types.ts    ← defineTool()/ToolModule (schema zod → JSON schema + validación runtime)
│   │   │       ├── okaClient.ts     ← Cliente HTTP hacia la API de Oka
│   │   │       ├── customer.tool.ts       ← get_customer
│   │   │       ├── leads.tool.ts          ← consultar_leads
│   │   │       ├── simulate-credit.tool.ts ← simulate_credit (simulador de crédito)
│   │   │       └── create-sale.tool.ts    ← create_sale (crea el loan)
│   │   └── routes/
│   │       └── chat.routes.ts       ← Endpoint POST /chat (valida el body con zod)
│   ├── dist/                        ← Build compilado con `tsc` (git-ignored)
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── widget/                         ← Widget embebible — React + TypeScript (Vite, modo librería)
│   ├── src/
│   │   ├── main.tsx                 ← Entry point (lee data-api-url, monta <Widget />)
│   │   ├── Widget.tsx               ← Estado top-level (historial, isOpen, isSending, ui activa)
│   │   ├── api.ts                   ← Única llamada fetch a /chat
│   │   ├── types.ts                 ← Contrato con el backend (mensajes + discriminated union de `ui`)
│   │   ├── components/              ← Launcher, ChatPanel, MessageList, InputRow, ui/* (6 tipos de `ui`: offer_selector, product_selector, credit_simulator, sale_summary, sale_success, onboarding_redirect)
│   │   └── styles/                  ← CSS Modules (evita colisión de estilos con la página host)
│   ├── dist/aoki-widget.js          ← Build final: un único IIFE embebible (`npm run build`)
│   ├── index.html                   ← Harness de desarrollo (Vite dev server, con HMR)
│   ├── demo-prod.html               ← Prueba del build de producción real, sin dev server
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── AokiContextMVP.md                ← Contexto completo del proyecto (usar con Claude)
├── .gitignore
└── Readme.md
```

---

## Requisitos previos

- Node.js >= 20
- npm >= 9
- API key de [Groq](https://console.groq.com) (`GROQ_API_KEY`)
- Token de la API de Oka (`OKA_TOKEN`) — solicitarlo al equipo de backend

---

## Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/oka-fintech/aoki.git
cd aoki

# 2. Instalar dependencias del backend
cd backend
npm install
cp .env.example .env
# Editar .env con tus keys (ver sección Variables de entorno)

# 3. Instalar dependencias del widget
cd ../widget
npm install
```

---

## Variables de entorno

Crear el archivo `backend/.env` basándose en `backend/.env.example`:

```env
# Groq — modelo openai/gpt-oss-120b
GROQ_API_KEY=gsk_...

# Oka — API (única base URL y token para todos los endpoints)
OKA_BASE_URL=https://api.dev.oka.com.pe/v1
OKA_TOKEN=tu-bearer-token

# Servidor
PORT=3000

# CORS — origen permitido (en desarrollo usar *)
CORS_ORIGIN=https://www.oka.com.pe
```

`backend/src/config/env.ts` valida estas variables al arrancar (con `zod`) — si falta alguna requerida, el servidor falla rápido con un mensaje claro en vez de fallar silenciosamente en la primera llamada a Oka.

> ⚠️ Nunca subas `.env` al repositorio. Está en `.gitignore`.

---

## Arrancar en desarrollo

```bash
# Backend — desde backend/
cd backend
npm run dev          # tsx watch, recarga en caliente

# Output esperado:
# Aoki backend corriendo en :3000
```

```bash
# Widget — desde widget/, en otra terminal
cd widget
npm run dev          # Vite dev server con HMR, por defecto en :5173
```

El harness de desarrollo (`widget/index.html`) apunta por defecto a `http://localhost:3000/chat`.

Para probar solo el backend sin el widget, usar Postman o curl:

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
  "reply": "¡Hola! Para comenzar, por favor indícame tu DNI.",
  "ui": null,
  "messages": [
    { "role": "user", "content": "Hola, mi DNI es 45678912" },
    { "role": "assistant", "content": "¡Hola! Para comenzar, por favor indícame tu DNI." }
  ]
}
```

`ui` es un discriminated union (`product_selector` | `credit_simulator` | `sale_summary` | `sale_success` | `onboarding_redirect` | `null`) tipado en `backend/src/agent/orchestrator.ts` y espejado en `widget/src/types.ts`.

---

## Probar el widget en el navegador

```bash
# Backend corriendo en una terminal (npm run dev, ver arriba)

# Widget — dev server con HMR, desde widget/
cd widget
npm run dev
# → http://localhost:5173
```

Para probar el **artefacto final compilado** (el mismo `<script>` que se embebe en producción, sin dev server):

```bash
cd widget
npm run build
npx serve .
# abrir http://localhost:3000/demo-prod.html (carga dist/aoki-widget.js directamente)
```

> Asegúrate de que el backend esté corriendo antes de abrir cualquiera de los dos.

---

## APIs que orquesta Aoki

Aoki tiene acceso a cuatro herramientas (tools) que llaman a la API de Oka (`OKA_BASE_URL`), definidas en `backend/src/agent/tools/` con `defineTool()` (un único schema de `zod` genera a la vez el JSON schema que ve el modelo y la validación runtime del input):

| Tool                    | Endpoint                | Descripción                                                    |
| ----------------------- | ------------------------ | --------------------------------------------------------------- |
| `get_customer`          | `GET /customers`         | Consulta nombre e id del cliente por tipo/número de documento   |
| `consultar_leads`       | `GET /leads`              | Verifica si el DNI tiene línea de crédito preaprobada           |
| `simulate_credit`       | `POST /simulations`       | Simula cuotas del crédito (simulador interactivo de monto/plazo) |
| `create_sale`           | `POST /leads/{leadId}/sales` | Convierte el lead en loan (venta confirmada)                  |

El resumen de la oferta ("Ver resumen"/"Modificar", `ui.type: sale_summary`) se construye enteramente en el widget a partir de los datos que ya trae `credit_simulator` — no requiere ninguna llamada adicional a la API de Oka.

Ver documentación completa de las APIs en `AokiContextMVP.md`.

---

## Flujo del agente

```
Usuario ingresa DNI
       ↓
[TOOL] consultar_leads(dni) + get_customer(dni)
       ↓
¿Tiene línea activa?
  ├── NO  → Mensaje amable → FIN
  └── SÍ  → Muestra oferta preaprobada (product_selector)
               ↓
             Usuario elige producto
               ↓
             [TOOL] simulate_credit(...) → simulador interactivo (credit_simulator)
               ↓
             Usuario ajusta monto/plazo → [TOOL] simulate_credit(...) de nuevo
               ↓
             Usuario hace clic en "Ver resumen" → resumen local (sale_summary, sin llamada a Oka)
               ↓
             "Modificar" (vuelve al simulador, local) o "Sí, confirmar"
               ↓
             [TOOL] create_sale(...)
               ↓
             Muestra Loan ID + CTA "Inicia sesión para desembolsar" (sale_success)
```

---

## Integración en Webflow

Compilar el widget (`cd widget && npm run build`) y publicar `widget/dist/aoki-widget.js` (por ejemplo detrás de `https://agent.oka.com.pe/aoki-widget.js`), luego pegar esta línea en:
**Webflow → Settings → Custom Code → Footer Code**

```html
<script src="https://agent.oka.com.pe/aoki-widget.js" data-api-url="https://agent.oka.com.pe/chat" defer></script>
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
railway variables set GROQ_API_KEY=gsk_...
railway variables set OKA_BASE_URL=https://api.oka.com.pe/v1
railway variables set OKA_TOKEN=tu-token-oka
railway variables set CORS_ORIGIN=https://www.oka.com.pe

# 5. Deploy — Railway detecta el script "build" (tsc) y luego corre "start" (node dist/server.js)
railway up

# Output: https://aoki-backend.railway.app
```

### Widget — servir como archivo estático

`npm run build` en `widget/` genera un único archivo, `widget/dist/aoki-widget.js` (IIFE minificado, con el CSS ya inyectado), listo para servir desde:

- **S3 + CloudFront** (recomendado para producción en AWS)
- **Railway** junto con el backend como archivo estático
- **Cualquier CDN**

No requiere un paso de minificación aparte — Vite ya minifica el JS y empaqueta el CSS al compilar.

---

## Plan MVP — 4 semanas (historial)

| Semana | Objetivo                              | Entregable                                  |
| ------ | ------------------------------------- | ------------------------------------------- |
| **1**  | Backend + LLM + API Leads             | `POST /chat` responde con línea preaprobada |
| **2**  | APIs Seguros + Sales + flujo completo | Conversación end-to-end en Postman          |
| **3**  | Widget embebido + UI en navegador     | Página demo funcional en local              |
| **4**  | Pulido + deploy + demo                | URL pública lista para presentar            |

Completado, y posteriormente migrado a TypeScript (backend) y React + TypeScript (widget) para mantenibilidad a largo plazo — ver plan detallado día a día en `AokiContextMVP.md`.

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

**¿Por qué migrar el backend a TypeScript?**
El servicio creció a 5 tools y una lógica de orquestación con varios discriminated unions (`ui.type`, mensajes de Groq) que antes no tenían ningún chequeo estático. TypeScript detecta en compilación errores como un tool renombrado sin actualizar el `switch` de `buildUi`, y `zod` cierra el hueco de validación runtime que no existía (inputs de tools y variables de entorno).

**¿Por qué `zod` y no solo tipos de TypeScript?**
Los tipos de TypeScript desaparecen en runtime — no protegen contra un `tool_call.function.arguments` mal formado que llega del modelo. `zod` genera el JSON schema que ve Groq y valida el input real en un solo lugar (`defineTool()`), sin mantener dos fuentes de verdad.

**¿Por qué React + Vite (modo librería) para el widget y no mantenerlo en JS plano?**
El widget original era un solo archivo de ~460 líneas con un `if/else` gigante para 5 tipos de UI interactiva (selector de producto, simulador de crédito, seguros, etc.) — difícil de extender sin romper algo. React separa cada tipo de `ui` en su propio componente tipado. Vite en modo librería permite seguir entregando un único `<script>` embebible (mismo contrato que antes), sin exponer una SPA.

**¿Por qué CSS Modules en el widget y no mantener el CSS global?**
El widget original inyectaba un único bloque de CSS global con clases `.aoki-*`, con riesgo real de colisión con los estilos de la página host (Webflow). CSS Modules hashea las clases en build sin costo de runtime ni dependencias nuevas.

---

## Contexto para Claude

El archivo `AokiContextMVP.md` (en la raíz del repo) contiene el contexto completo del proyecto. Para continuar el desarrollo en una nueva sesión de Claude, adjuntar ese archivo al inicio del chat.

---

## Licencia

Uso interno — IH Fintech S.A. © 2026. Documento confidencial.
