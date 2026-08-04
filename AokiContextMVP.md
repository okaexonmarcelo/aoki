# Aoki — Contexto completo del proyecto + Plan MVP 4 semanas

> Este documento es el contexto completo del proyecto Aoki para ser usado como referencia en una nueva sesión de Claude. Contiene todo lo necesario para continuar el desarrollo sin perder contexto.

---

## 0. Estado actual (post-MVP)

El plan de 4 semanas descrito en la sección 7 **ya se completó**. Dos cosas importantes divergieron de lo planeado originalmente en este documento — léelas antes que el resto:

1. **El modelo usado es Groq (`openai/gpt-oss-120b`), no Claude API/Anthropic.** Las secciones de este documento que mencionan `@anthropic-ai/sdk`/`ANTHROPIC_API_KEY` describen el plan inicial; el MVP real se construyó sobre `groq-sdk`.
2. **El backend se migró a TypeScript y el widget a React + TypeScript** (después de completado el MVP en JS plano), para mejorar mantenibilidad. Los ejemplos de código de la sección 6 quedaron obsoletos — el código real y actualizado vive en `backend/src/` y `widget/src/`. Ver `Readme.md` (raíz del repo) para la estructura y comandos actuales.
3. **`simular_seguro` (`POST /seguros/simular`) y `convertir_lead_a_loan` (`POST /sales/convert`) nunca fueron endpoints reales de Oka** — eran placeholders del diseño inicial que no existían en la API real y devolvían error al usarse. Se eliminaron y reemplazaron por una sola tool `create_sale` (`POST /leads/{leadId}/sales`, ver Readme.md). El paso de "resumen" (antes `insurance_selector`, montado sobre `simular_seguro`) ahora se construye enteramente en el widget a partir de los datos que ya trae `simulate_credit`, sin llamar a ningún endpoint adicional. Las secciones 3.5, 3.6 (renombradas como históricas) describen el diseño viejo/incorrecto — quedan como contexto, no como referencia de la API real. La sección 3.4 y el flujo de la sección 4 ya están actualizados con `create_sale`.

Resumen del stack real hoy:

| Capa                | Tecnología                                                        |
| ------------------- | ------------------------------------------------------------------ |
| Backend             | Node.js + **TypeScript**, Express                                  |
| Modelo de lenguaje  | **Groq** (`openai/gpt-oss-120b`), vía `groq-sdk`                    |
| Validación runtime  | **zod** (inputs de tools vía `defineTool()`, y `env.ts`)            |
| Tools del agente    | `get_customer`, `consultar_leads`, `simulate_credit`, `create_sale` |
| Widget frontend     | **React + TypeScript**, Vite (modo librería) → un único IIFE        |
| Estilos del widget  | CSS Modules                                                         |
| Tests               | `vitest` (backend: `buildUi` + schemas de zod)                      |
| Deploy backend      | Railway.app                                                         |

El resto de este documento (secciones 1–9) se conserva como contexto histórico de negocio/producto (sigue siendo válido) y de planeamiento técnico original (parcialmente superado, ver notas arriba).

---

## 1. Qué es Oka

**Oka** es la fintech de **IH Fintech S.A.** (RUC 20610782168), respaldada por Hiraoka.

- Web: https://www.oka.com.pe (construida en **Webflow CMS**)
- Dirección: Av. Petit Thouars 5208, Miraflores, Lima, Perú
- Contacto: conversemos@oka.com.pe / (01) 705-1717

### Productos de Oka

| Producto         | Descripción                                                         |
| ---------------- | ------------------------------------------------------------------- |
| **Crédito Oka**  | Comprar electrodomésticos y tecnología en tiendas Hiraoka en cuotas |
| **Efectivo Oka** | Préstamo de dinero en efectivo de libre disponibilidad              |

### Brand colors

- **Verde lima**: `#C8E63C` — color primario, CTAs, botones
- **Azul marino**: `#0A0A2E` — headers, fondos oscuros, navbar
- **Verde oscuro**: `#3B6D11` — texto sobre verde lima
- **Verde claro**: `#F4FAD4` — fondos de badges de éxito

---

## 2. Qué es Aoki

**Aoki** es el agente conversacional inteligente de Oka, powered by **Claude API (Anthropic)**.

Su propósito es reemplazar el formulario tradicional de onboarding por una conversación natural que:

1. Identifica al usuario por DNI
2. Consulta su línea de crédito preaprobada
3. Simula el crédito y muestra un resumen de la oferta
4. Convierte el lead en loan
5. Lo lleva al desembolso

### Nombre del agente

- Nombre: **Aoki**
- Presentación: "Soy Aoki, tu asistente de Oka"
- Estado: "En línea ahora"

---

## 3. APIs existentes de Oka (tal como las consume el código real)

Todas viven bajo una única `OKA_BASE_URL` (ver `backend/src/agent/tools/okaClient.ts`), autenticadas con `Authorization: Bearer {OKA_TOKEN}`. Aoki las orquesta como 4 tools (`backend/src/agent/tools/*.tool.ts`), cada una definida con `defineTool()` (el schema de `zod` genera el JSON schema que ve el modelo y valida el input en runtime).

> Nota: los endpoints/shapes de esta sección son los reales usados por el código (`GET`/`POST` contra `OKA_BASE_URL`), que difieren del diseño inicial (`/leads/check` como POST, etc.) documentado en versiones anteriores de este archivo.

### 3.1 `get_customer` — datos del cliente

```
GET {OKA_BASE_URL}/customers?type=DNI&number=45678912
Authorization: Bearer {OKA_TOKEN}

Response: { "id": "cust_123", "name": "Juan Pérez" }  (o 404 si no existe)
```

### 3.2 `consultar_leads` — consulta de línea preaprobada

```
GET {OKA_BASE_URL}/leads?documentType=DNI&documentNumber=45678912
Authorization: Bearer {OKA_TOKEN}

Response: [
  { "id": "lead_abc", "status": "ACTIVE", "amount": 3500, "product": { "subType": "BNPL" } },
  ...
]
```

`subType: "BNPL"` → Crédito Oka, `subType: "LD"` → Efectivo Oka. Puede haber más de un lead `ACTIVE` a la vez.

### 3.3 `simulate_credit` — simulador de crédito (monto/plazo)

```
POST {OKA_BASE_URL}/simulations
Authorization: Bearer {OKA_TOKEN}
Content-Type: application/json

Body: {
  "customer": { "id": "cust_123" },
  "loan": { "amount": 3500, "paymentDay": 15 },
  "lead": { "id": "lead_abc" },
  "insuranceTypes": ["LIFE"]
}

Response: [
  { "term": 6,  "monthlyPayment": 620.5, "interestRate": 3.5, "totalRate": 20.1, "totalPayment": 3723 },
  { "term": 12, "monthlyPayment": 330.2, "interestRate": 3.5, "totalRate": 35.4, "totalPayment": 3962 }
]
```

### 3.4 `create_sale` — conversión de lead a venta (real)

```
POST {OKA_BASE_URL}/leads/{leadId}/sales
Authorization: Bearer {OKA_TOKEN}
Content-Type: application/json

Body:
{
  "customer": { "id": "cust_123" },
  "amount": 3500,
  "currency": "PEN",
  "term": 12,
  "paymentDay": 15,
  "insurancesTypes": ["LIFE"],
  "simulation": { "type": "REGULAR" },
  "metadata": { "origin": "CHATBOT" }
}

Response: { "id": "cf01bb81-9500-4ea7-bf84-a11f03e887bb" }
```

Solo se llama cuando el usuario confirma explícitamente el resumen ("Sí, confirmar") — es el paso final e irreversible. Ver `backend/src/agent/tools/create-sale.tool.ts`.

### 3.5 (histórico, endpoint nunca existió) `simular_seguro` — simulación de seguros opcionales

> ⚠️ Ver nota 3 de la sección 0: `POST /seguros/simular` nunca fue un endpoint real de Oka. Esta tool se eliminó por completo.

```
POST {OKA_BASE_URL}/seguros/simular
Authorization: Bearer {OKA_TOKEN}
Content-Type: application/json

Body: { "monto": 3500, "plazo": 12 }

Response:
{
  "seguro_vida_plus":  { "prima": 12.50, "descripcion": "Cubre deuda en caso de fallecimiento o invalidez total" },
  "seguro_desempleo":  { "prima": 8.00,  "descripcion": "Cubre cuotas hasta 6 meses si pierdes tu trabajo involuntariamente" },
  "cuota_sin_seguro":  245.00,
  "cuota_con_seguros": 265.50,
  "tcea": 50.23
}
```

### 3.6 (histórico, endpoint nunca existió) `convertir_lead_a_loan` — conversión lead a loan

> ⚠️ Ver nota 3 de la sección 0: `POST /sales/convert` nunca fue un endpoint real de Oka. Reemplazada por `create_sale` (sección 3.4).

```
POST {OKA_BASE_URL}/sales/convert
Authorization: Bearer {OKA_TOKEN}
Content-Type: application/json

Body:
{
  "lead_id": "lead_abc",
  "monto": 3500,
  "plazo": 12,
  "producto": "credito_oka",
  "seguros": ["vida_plus"]
}

Response: { "url_onboarding": "https://onboarding.oka.com.pe/loan_xyz" }
```

---

## 4. Flujo principal del agente

```
Usuario ingresa DNI
       ↓
[TOOL] consultar_leads(dni) + get_customer(dni)  (para personalizar el saludo)
       ↓
¿Tiene algún lead con status ACTIVE?
  ├── NO  → Mensaje amable → FIN
  └── SÍ  → Muestra badge "¡Crédito preaprobado! hasta S/{monto_máximo}" (ui: product_selector)
               ↓
             Presenta productos como cards seleccionables:
             - Crédito Oka (subType BNPL): "Renueva tu hogar hoy y paga en cómodas cuotas"
             - Efectivo Oka (subType LD): "Dinero en tu cuenta en minutos, sin explicaciones"
               ↓
             Usuario elige un producto
               ↓
             [TOOL] simulate_credit(customer_id, lead_id, amount, payment_day) → simulador interactivo (ui: credit_simulator)
               ↓
             Usuario ajusta el slider de monto → [TOOL] simulate_credit(...) de nuevo con el nuevo amount
               ↓
             Usuario hace clic en "Ver resumen de mi crédito"
             → 100% local en el widget (ui: sale_summary, sin ninguna llamada a Oka):
               Producto, monto, cuotas, Vida ✓ incluido, TCEA
               ↓
             "Modificar" (local, vuelve al slider) o "Sí, confirmar"
               ↓
             [TOOL] create_sale(lead_id, customer_id, amount, term, payment_day)
               ↓
             Muestra Loan ID + CTA "Inicia sesión para desembolsar" → personas.oka.com.pe (ui: sale_success)
```

Cada paso de este flujo corresponde a un `ui.type` (discriminated union) y a un componente React homónimo en `widget/src/components/ui/`. La mayoría (`product_selector`, `credit_simulator`, `sale_success`) los devuelve `buildUi()` en `backend/src/agent/orchestrator.ts` a partir del último tool-call — la única excepción es `sale_summary`, que `Widget.tsx` construye enteramente en el cliente a partir del `credit_simulator` activo, sin pasar por el backend.

### Pasos del proceso (stepper visual)

> ⚠️ Esta sección describe un mockup/diseño aspiracional (panel lateral con stepper "Último paso"). Se evaluó explícitamente construirlo y se decidió **no** hacerlo: la UI real es un único panel de chat con tarjetas de UI generativa inline (mismo patrón que `product_selector`/`credit_simulator`/etc.), sin panel lateral ni stepper. Los "pasos" abajo son conceptuales, no un componente que exista en el código.

1. **Simular** — monto, plazo
2. **Resumen** — resumen de la oferta (Vida Plus incluido, sin seguro de Desempleo)
3. **Confirmación** — confirmar antes de crear loan
4. **Desembolso** — verificación de identidad + firma + cuenta

### Pasos del onboarding (post-loan)

1. Verificación de identidad
2. Firma del contrato
3. Cuenta de desembolso

---

## 5. Arquitectura técnica

### Real (MVP entregado y migrado)

```
Página host (ej. Webflow, oka.com.pe)
  └── <script src=".../aoki-widget.js" data-api-url="https://agent.oka.com.pe/chat">
         (React + TypeScript, compilado con Vite a un único IIFE)
         ↓ HTTP POST /chat
Microservicio Aoki (Node.js + TypeScript · Railway.app)
  ├── Groq (openai/gpt-oss-120b) — orquestador (groq-sdk)
  ├── Tool: get_customer    → GET  {OKA_BASE_URL}/customers
  ├── Tool: consultar_leads → GET  {OKA_BASE_URL}/leads
  ├── Tool: simulate_credit → POST {OKA_BASE_URL}/simulations
  └── Tool: create_sale     → POST {OKA_BASE_URL}/leads/{leadId}/sales
```

El resumen de la oferta (`sale_summary`, "Ver resumen"/"Modificar") no llama a ninguna tool ni a la API de Oka — se construye en el widget con los datos que ya trajo `simulate_credit`.

Sin base de datos propia: cada request a `/chat` es sin estado en el servidor — el widget reenvía el historial completo de la conversación en cada turno (`messages`), y el backend responde con el historial actualizado.

### Stack tecnológico real

| Capa               | Tecnología                     | Estado                      |
| ------------------ | ------------------------------ | --------------------------- |
| CMS / Web          | Webflow                                  | Existente     |
| Widget frontend    | React + TypeScript (Vite, modo librería) | Implementado  |
| Estilos del widget | CSS Modules                              | Implementado  |
| Agente orquestador | Node.js + TypeScript + Express           | Implementado  |
| Modelo de lenguaje | Groq (`openai/gpt-oss-120b`)             | Implementado  |
| Validación runtime | zod (tool inputs + variables de entorno) | Implementado  |
| Tests              | vitest (backend)                         | Implementado  |
| Base de datos      | —                                         | No implementada (sin estado) |
| Infraestructura    | Railway.app                              | Implementado  |
| Autenticación      | —                                         | No implementada (post-MVP) |

### Variables de entorno reales

```
GROQ_API_KEY=gsk_...
OKA_BASE_URL=https://api.dev.oka.com.pe/v1
OKA_TOKEN=tu-bearer-token
PORT=3000
CORS_ORIGIN=https://www.oka.com.pe
```

Validadas al boot por `backend/src/config/env.ts` con `zod` — el servidor no arranca si falta alguna requerida.

### Plan original (histórico, no implementado tal cual)

El diseño inicial contemplaba Claude API (Anthropic), AWS ECS y DynamoDB (sesiones con TTL 24h + logs de auditoría sin TTL por compliance SBS). Ninguna de las tres se usó en el MVP real: se optó por Groq (costo/latencia), Railway (deploy más simple) y una arquitectura sin estado en servidor (el propio widget mantiene el historial). Si el proyecto pasa a producción con requisitos de auditoría/compliance, DynamoDB (o equivalente) para logs seguiría siendo la recomendación.

---

## 6. Código base real (post-migración a TypeScript / React)

> Esta sección reemplaza el ejemplo de código original del MVP (JS plano + Anthropic SDK), que quedó obsoleto tanto en el modelo usado (Groq, no Claude) como en el lenguaje (TypeScript, no JS). El código fuente completo vive en el repo — aquí solo se resume la forma, no se duplica línea por línea.

### 6.1 Backend (`backend/src/`)

- **`agent/tools/tool.types.ts`** — `defineTool({ name, description, schema, execute })`: recibe un schema de `zod` y genera automáticamente el `input_schema` (JSON schema) que se envía al modelo vía `z.toJSONSchema()`, además de tipar `execute()`. Un único schema por tool es la fuente de verdad tanto para lo que ve el modelo como para la validación runtime.
- **`agent/tools/*.tool.ts`** — una tool por archivo (`get_customer`, `consultar_leads`, `simulate_credit`, `create_sale`), cada una construida con `defineTool()` sobre `okaClient.ts` (`okaGet`/`okaPost`).
- **`agent/orchestrator.ts`** — `runConversation(history)`: arma el loop de tool-calling contra Groq (`client.chat.completions.create`, máx. 5 rondas de tools), y `buildUi(messages)`: mapea el último tool-call relevante a un `UiPayload` (discriminated union: `product_selector | credit_simulator | sale_success | null`), con el `switch` chequeado exhaustivamente por el compilador. `sale_summary` no está en este union — lo construye el widget, no el backend.
- **`agent/prompts.ts`** — `SYSTEM_PROMPT`, el mismo contenido de negocio que en el MVP original (reglas de cuándo llamar cada tool), solo movido a TypeScript.
- **`config/env.ts`** — valida `GROQ_API_KEY`, `OKA_BASE_URL`, `OKA_TOKEN`, `PORT`, `CORS_ORIGIN` con `zod` al boot; falla rápido si falta algo.
- **`routes/chat.routes.ts`** — `POST /chat`: valida `req.body.messages` con `zod` y delega en `runConversation`.
- **`server.ts`** — bootstrap de Express (cors, rate limiting, monta las rutas).

### 6.2 Widget (`widget/src/`)

- **`main.tsx`** — entry point: lee `data-api-url` del `<script>` (`document.currentScript`), monta `<Widget />` con `createRoot`.
- **`Widget.tsx`** — dueño del estado (`history` para el payload al backend, `displayMessages` para las burbujas visuales, `isOpen`, `isSending`, `activeUi`, y `lastCreditSimulatorUi` para poder volver al slider cuando el usuario hace clic en "Modificar") y de `handleSend` (ida y vuelta al backend), `handleShowSummary` y `handleModify` (transiciones puramente locales, sin red).
- **`api.ts`** — única llamada `fetch` a `/chat`.
- **`types.ts`** — espejo a mano del contrato del backend (`ChatMessage`, `Ui` discriminated union) — sin paquete compartido entre los dos proyectos, con comentario apuntando a `orchestrator.ts` como fuente de verdad. Excepción documentada: `SaleSummaryUi` nunca la produce el backend, la construye `Widget.tsx`.
- **`components/`** — `Launcher`, `ChatPanel`, `MessageList`, `MessageBubble`, `InputRow`, y `components/ui/` con un componente por `ui.type` (`ProductSelector`, `CreditSimulator`, `SaleSummary`, `SaleSuccess`, `OnboardingRedirect`, `OfferSelector`), despachados por `UiRenderer` con chequeo de exhaustividad.
- **`styles/*.module.css`** — CSS Modules (clases hasheadas en build, sin colisión con la página host).
- Build: `vite.config.ts` en modo librería (`build.lib`, formato `iife`) + `vite-plugin-css-injected-by-js` → un único `dist/aoki-widget.js`, mismo contrato de embed de un solo `<script>` que el widget original.

### 6.3 Embed en Webflow (sin cambios de contrato)

```html
<!-- Pegar en Webflow → Settings → Custom Code → Footer Code -->
<script src="https://agent.oka.com.pe/aoki-widget.js" data-api-url="https://agent.oka.com.pe/chat" defer></script>
```

---

## 7. Plan MVP — 4 semanas · 1 desarrollador

### Contexto del MVP

- **Equipo**: 1 desarrollador
- **APIs**: 100% listas y documentadas
- **Objetivo**: Demo interna para el líder técnico
- **Restricciones para el MVP**: sin DynamoDB, sin WebSockets, sin deploy en AWS, sin integración real en Webflow — todo en local/Railway.app

### Semana 1 — Backend + Claude API + API Leads

**Objetivo: Aoki consulta el DNI y responde con la línea preaprobada**

| Día       | Tarea                                                                       |
| --------- | --------------------------------------------------------------------------- |
| Lunes     | Setup Node.js, instalar dependencias, configurar env vars                   |
| Martes    | Implementar `server.js` con endpoint `/chat` y conexión a Claude API        |
| Miércoles | Definir tool `consultar_leads` y conectarla a la API de leads               |
| Jueves    | Probar flujo completo desde Postman: DNI → Claude → API Leads → respuesta   |
| Viernes   | Ajuste de prompts, manejo de errores, casos borde (DNI inválido, sin línea) |

**Entregable**: endpoint `/chat` que dado un DNI responde correctamente.

### Semana 2 — APIs de Seguros y Sales + flujo completo

**Objetivo: flujo end-to-end desde DNI hasta conversión de lead a loan**

| Día       | Tarea                                                                    |
| --------- | ------------------------------------------------------------------------ |
| Lunes     | Agregar tool `simular_seguro` conectada a API de seguros                 |
| Martes    | Agregar tool `convertir_lead_a_loan` conectada a endpoint sales          |
| Miércoles | Refinar prompt para guiar al usuario por los 4 pasos en orden            |
| Jueves    | Pruebas del flujo completo end-to-end                                    |
| Viernes   | Ajuste de casos borde: cambio de monto, rechazo de seguros, volver atrás |

**Entregable**: conversación completa funcionando en Postman o terminal.

### Semana 3 — Widget embebido + UI

**Objetivo: el flujo se puede ver y usar en un navegador**

| Día       | Tarea                                                                   |
| --------- | ----------------------------------------------------------------------- |
| Lunes     | Construir `aoki-widget.js` con chat UI y colores brand Oka              |
| Martes    | Conectar widget al backend, probar flujo completo en navegador          |
| Miércoles | Agregar simulador visual (sliders de monto/plazo, cuota en tiempo real) |
| Jueves    | Agregar toggles de seguros Vida Plus y Desempleo con tooltips           |
| Viernes   | Crear página HTML de demo que simule el aspecto de oka.com.pe           |

**Entregable**: página web local con demo completa visualmente.

### Semana 4 — Pulido + preparación de la demo

**Objetivo: demo lista para presentar al líder técnico**

| Día       | Tarea                                                                    |
| --------- | ------------------------------------------------------------------------ |
| Lunes     | Deploy en Railway.app (gratis, deploy con `git push`)                    |
| Martes    | Pruebas end-to-end con DNIs reales de prueba en producción               |
| Miércoles | Preparar 3 escenarios de demo (con línea, sin línea, cambio de producto) |
| Jueves    | Colchón para bugs de último momento                                      |
| Viernes   | **Demo al líder técnico**                                                |

**Entregable**: demo funcional en URL pública con escenarios preparados.

### Features del MVP

| Feature                                       | ¿Incluido?  |
| --------------------------------------------- | ----------- |
| Consulta de línea por DNI                     | ✅          |
| Selector de producto (Crédito / Efectivo Oka) | ✅          |
| Simulador de monto y plazo                    | ✅          |
| Seguros Vida Plus y Desempleo                 | ✅          |
| Conversión lead a loan                        | ✅          |
| Chat widget con brand Oka                     | ✅          |
| Manejo de usuario sin línea                   | ✅          |
| Deploy accesible por URL                      | ✅          |
| Autenticación / seguridad productiva          | ❌ post-MVP |
| DynamoDB / persistencia                       | ❌ post-MVP |
| Integración real en Webflow                   | ❌ post-MVP |
| Verificación de identidad / firma             | ❌ post-MVP |

### Riesgos y mitigaciones

| Riesgo                               | Mitigación                                      |
| ------------------------------------ | ----------------------------------------------- |
| APIs con comportamientos inesperados | Viernes semana 1 y 2 son buffer para esto       |
| Prompts que no guían bien el flujo   | Jueves semana 2 reservado para iterar prompts   |
| Bugs del widget en navegador         | Jueves semana 4 es colchón exclusivo            |
| Fallo en deploy el día de la demo    | Hacer deploy el lunes semana 4, no el mismo día |

### Métricas de éxito para la demo

Al finalizar el mes debes poder mostrar:

- Usuario ingresa DNI → respuesta en menos de 5 segundos con línea preaprobada
- Simulación de crédito con seguros → loan creado en una sola conversación
- Flujo completo en menos de 3 minutos
- Usuario sin línea → respuesta amable, sin errores

---

## 8. Decisiones de diseño tomadas

### ¿Por qué el registro va después de la simulación?

El DNI actúa como **registro suave**: identifica al usuario y personaliza la oferta sin pedir email ni contraseña. El registro formal aparece solo cuando el usuario ya confirmó que quiere el crédito, cuando la motivación es máxima.

### ¿Por qué Groq y no Claude API?

Se evaluaron Llama 3.3 / gpt-oss (Groq), Claude API, Gemini Flash, Mistral, Qwen 2.5 y DeepSeek. La arquitectura de tool-calling es prácticamente idéntica con cualquiera (mensajes + tools + loop de tool_calls). El MVP real se construyó sobre Groq (`openai/gpt-oss-120b`) por latencia/costo; el plan original de este documento contemplaba Claude API, pero no fue lo que se implementó. Migrar de proveedor implicaría sobre todo tocar `orchestrator.ts` (tipos de mensajes/tool_calls) — el resto de la arquitectura (tools, prompts, UI) es independiente del proveedor.

### ¿Qué es TTL 24h en DynamoDB?

Time To Live — mecanismo nativo de DynamoDB que elimina automáticamente los registros de sesión después de 24 horas. Los logs de auditoría (`oka_agent_audit_logs`) no tienen TTL por requerimientos de compliance SBS.

### ¿Por qué IIFE en el widget?

El widget se autocontiene en una Immediately Invoked Function Expression para no contaminar el scope global de Webflow ni interferir con otros scripts del CMS.

---

## 9. ROI esperado del proyecto completo

| Métrica                   | Antes     | Con Aoki | Mejora |
| ------------------------- | --------- | -------- | ------ |
| Tasa de conversión        | 3–5%      | 12–18%   | +300%  |
| Tiempo de onboarding      | 15–20 min | < 3 min  | −85%   |
| Costo por adquisición     | Alto      | Reducido | −50%   |
| Tickets de soporte humano | 100%      | ~20%     | −80%   |

**Inversión de desarrollo**: $15,000 – $25,000 (one-time)
**Operación mensual**: $700 – $2,000
**ROI estimado**: recuperación en menos de 3 meses

---

## 10. Cómo usar este contexto

Si estás en una nueva sesión de Claude con este documento, puedes:

- Pedir que genere código para cualquier semana del MVP
- Pedir que refine el prompt del sistema de Aoki
- Pedir que agregue nuevas herramientas (tools) al agente
- Pedir que construya la página HTML de demo
- Pedir que configure el deploy en Railway.app
- Pedir que extienda el widget con nuevas funcionalidades
- Pedir que genere tests para el backend
- Preguntar sobre cualquier decisión técnica o de negocio listada aquí

**Todo el stack es Node.js + TypeScript + Groq + APIs REST de Oka, con un widget en React + TypeScript. Sin magia.**
