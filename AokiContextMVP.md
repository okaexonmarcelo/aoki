# Aoki — Contexto completo del proyecto + Plan MVP 4 semanas

> Este documento es el contexto completo del proyecto Aoki para ser usado como referencia en una nueva sesión de Claude. Contiene todo lo necesario para continuar el desarrollo sin perder contexto.

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
3. Simula el crédito con seguros en tiempo real
4. Convierte el lead en loan
5. Lo lleva al desembolso

### Nombre del agente

- Nombre: **Aoki**
- Presentación: "Soy Aoki, tu asistente de Oka"
- Estado: "En línea ahora"

---

## 3. APIs existentes de Oka (ya construidas y documentadas)

Estas tres APIs ya existen y están listas para consumirse. Aoki las orquesta como herramientas (tool calling).

### 3.1 API Leads — consulta de línea preaprobada

```
POST https://api.oka.com.pe/v1/leads/check
Authorization: Bearer {OKA_API_KEY}
Content-Type: application/json

Body: { "dni": "45678912" }

Response:
{
  "tiene_linea": true,
  "linea_maxima": 3500,
  "productos": ["efectivo_oka", "credito_oka"],
  "lead_id": "abc123"
}
```

### 3.2 API Sales — conversión lead a loan

```
POST https://api.oka.com.pe/v1/sales/convert
Authorization: Bearer {OKA_API_KEY}
Content-Type: application/json

Body:
{
  "lead_id": "abc123",
  "monto": 2000,
  "plazo": 10,
  "producto": "efectivo_oka",
  "seguros": ["vida_plus"]
}

Response:
{
  "loan_id": "loan_xyz",
  "status": "onboarding_pending",
  "url_onboarding": "/onboarding/loan_xyz"
}
```

### 3.3 API Seguros — simulación de seguros

```
POST https://api.oka.com.pe/v1/seguros/simular
Authorization: Bearer {OKA_API_KEY}
Content-Type: application/json

Body: { "monto": 2000, "plazo": 10 }

Response:
{
  "seguro_vida_plus":  { "prima": 12.50, "descripcion": "Cubre deuda en caso de fallecimiento o invalidez total" },
  "seguro_desempleo":  { "prima": 8.00,  "descripcion": "Cubre cuotas hasta 6 meses si pierdes tu trabajo involuntariamente" },
  "cuota_sin_seguro":  245.00,
  "cuota_con_seguros": 265.50,
  "tcea": 50.23
}
```

---

## 4. Flujo principal del agente

```
Usuario ingresa DNI
       ↓
[TOOL] consultar_leads(dni)
       ↓
¿Tiene línea?
  ├── NO  → Mensaje amable + captura de email → FIN
  └── SÍ  → Muestra badge "¡Crédito preaprobado! hasta S/{linea_maxima}"
               ↓
             Presenta productos como cards seleccionables:
             - Crédito Oka: "Renueva tu hogar hoy y paga en cómodas cuotas"
             - Efectivo Oka: "Dinero en tu cuenta en minutos, sin explicaciones"
               ↓
             Usuario elige producto + monto + plazo
               ↓
             [TOOL] simular_seguro(monto, plazo)
               ↓
             Muestra simulación:
             - Cuota mensual
             - TCEA
             - Seguros opcionales: Vida Plus / Desempleo (con toggles)
               ↓
             Usuario confirma
               ↓
             [TOOL] convertir_lead_a_loan(lead_id, monto, plazo, producto, seguros)
               ↓
             Muestra resumen + redirige a url_onboarding
             "Crear cuenta para desembolsar"
```

### Pasos del proceso (stepper visual)

1. **Simular** — monto, plazo, seguros
2. **Resumen** — resumen de la oferta
3. **Confirmación** — confirmar antes de crear loan
4. **Desembolso** — verificación de identidad + firma + cuenta

### Pasos del onboarding (post-loan)

1. Verificación de identidad
2. Firma del contrato
3. Cuenta de desembolso

---

## 5. Arquitectura técnica

```
Webflow CMS (oka.com.pe)
  └── Custom Code embed: <script src="https://agent.oka.com.pe/aoki-widget.js">
         ↓ HTTP POST /chat
Microservicio Aoki (Node.js · AWS ECS)
  ├── Claude API (claude-sonnet-4-6) — orquestador
  ├── Tool: consultar_leads    → API Leads Oka
  ├── Tool: simular_seguro     → API Seguros Oka
  └── Tool: convertir_lead_a_loan → API Sales Oka
         ↓
DynamoDB
  ├── oka_agent_sessions   (TTL: 24h — Time To Live, expiración automática)
  └── oka_agent_audit_logs (sin TTL — compliance SBS)
```

### Stack tecnológico

| Capa               | Tecnología                     | Estado                      |
| ------------------ | ------------------------------ | --------------------------- |
| CMS / Web          | Webflow                        | Existente                   |
| Widget frontend    | JS puro (IIFE autocontenido)   | Nuevo                       |
| Agente orquestador | Node.js + Express              | Nuevo microservicio         |
| Modelo de lenguaje | Claude API (claude-sonnet-4-6) | Nuevo                       |
| Base de datos      | DynamoDB                       | Existente (2 tablas nuevas) |
| Infraestructura    | AWS ECS                        | Existente                   |
| Autenticación      | JWT (reutilizado)              | Existente                   |

### Variables de entorno necesarias

```
ANTHROPIC_API_KEY=sk-ant-...
OKA_API_KEY=tu-token-oka
PORT=3000
```

---

## 6. Código base del MVP

### 6.1 `package.json`

```json
{
  "name": "aoki-agent-service",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.27.0",
    "cors": "^2.8.5",
    "express": "^4.18.2"
  }
}
```

### 6.2 `server.js` — backend del agente

```javascript
const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
const client = new Anthropic();

app.use(cors({ origin: "https://www.oka.com.pe" }));
app.use(express.json());

// Herramientas disponibles para el agente
const tools = [
  {
    name: "consultar_leads",
    description:
      "Consulta si un usuario tiene línea de crédito preaprobada en Oka.",
    input_schema: {
      type: "object",
      properties: {
        dni: { type: "string", description: "DNI del usuario, 8 dígitos" },
      },
      required: ["dni"],
    },
  },
  {
    name: "simular_seguro",
    description: "Simula los seguros disponibles para un monto y plazo dado.",
    input_schema: {
      type: "object",
      properties: {
        monto: { type: "number", description: "Monto solicitado en soles" },
        plazo: { type: "number", description: "Número de cuotas mensuales" },
      },
      required: ["monto", "plazo"],
    },
  },
  {
    name: "convertir_lead_a_loan",
    description: "Convierte el lead en un loan y activa el onboarding.",
    input_schema: {
      type: "object",
      properties: {
        lead_id: { type: "string" },
        monto: { type: "number" },
        plazo: { type: "number" },
        producto: { type: "string", enum: ["efectivo_oka", "credito_oka"] },
        seguros: { type: "array", items: { type: "string" } },
      },
      required: ["lead_id", "monto", "plazo", "producto"],
    },
  },
];

// Ejecutor de herramientas — conecta con las APIs reales de Oka
async function executeTool(name, input) {
  const BASE = "https://api.oka.com.pe/v1";
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.OKA_API_KEY}`,
  };

  const endpoints = {
    consultar_leads: { url: `${BASE}/leads/check`, body: { dni: input.dni } },
    simular_seguro: {
      url: `${BASE}/seguros/simular`,
      body: { monto: input.monto, plazo: input.plazo },
    },
    convertir_lead_a_loan: { url: `${BASE}/sales/convert`, body: input },
  };

  const { url, body } = endpoints[name];
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${name} error: ${res.status}`);
  return res.json();
}

// Prompt del sistema
const SYSTEM_PROMPT = `
Eres Aoki, el asistente de créditos de Oka (IH Fintech S.A.).
Tu misión es ayudar al usuario a obtener su crédito preaprobado de forma rápida y sencilla.

Reglas:
- Saluda cordialmente y pide el DNI si el usuario no lo ha proporcionado.
- Cuando tengas el DNI (8 dígitos numéricos), llama SIEMPRE a consultar_leads.
- Si tiene línea: comunícalo con entusiasmo, muestra el monto máximo y pregunta qué producto necesita.
- Si no tiene línea: sé amable, explica que no hay oferta disponible en este momento.
- Cuando el usuario elija monto y plazo, llama a simular_seguro para mostrar la cuota exacta.
- Presenta los seguros Vida Plus y Desempleo como opcionales con sus precios.
- Cuando el usuario confirme, llama a convertir_lead_a_loan.
- Nunca inventes montos, tasas ni cuotas. Usa solo los datos que devuelven las herramientas.
- Responde siempre en español, de forma breve, amigable y clara.
- Guarda el lead_id que devuelve consultar_leads para usarlo en convertir_lead_a_loan.
`.trim();

// Endpoint del chat
app.post("/chat", async (req, res) => {
  const { messages } = req.body;
  if (!messages?.length)
    return res.status(400).json({ error: "messages requerido" });

  try {
    let response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });

    // Loop de tool calling
    while (response.stop_reason === "tool_use") {
      const toolBlock = response.content.find((b) => b.type === "tool_use");
      const { id, name, input } = toolBlock;
      const toolResult = await executeTool(name, input);

      response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools,
        messages: [
          ...messages,
          { role: "assistant", content: response.content },
          {
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: id,
                content: JSON.stringify(toolResult),
              },
            ],
          },
        ],
      });
    }

    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    res.json({ reply: text });
  } catch (err) {
    console.error("Aoki error:", err.message);
    res.status(500).json({ error: "Error interno del agente" });
  }
});

app.listen(process.env.PORT || 3000, () =>
  console.log(`Aoki backend corriendo en :${process.env.PORT || 3000}`),
);
```

### 6.3 `aoki-widget.js` — widget para Webflow

Widget autocontenido (IIFE) con chat UI, colores brand Oka, indicador de typing e historial de conversación en memoria. Se embebe con una sola línea en Webflow Custom Code.

> Ver archivo completo: `aoki-widget.js` (ya generado en sesión anterior)

### 6.4 Embed en Webflow

```html
<!-- Pegar en Webflow → Settings → Custom Code → Footer Code -->
<script src="https://agent.oka.com.pe/aoki-widget.js" defer></script>
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

### ¿Por qué no usar LLMs gratuitos?

Se evaluaron Llama 3.3 (Groq), Gemini Flash, Mistral, Qwen 2.5 y DeepSeek. La arquitectura es idéntica con cualquiera. Para el MVP se usa Claude API por calidad de razonamiento y seguimiento de instrucciones. Se puede migrar después.

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

**Todo el stack es Node.js + Claude API + APIs REST de Oka. Sin magia.**
