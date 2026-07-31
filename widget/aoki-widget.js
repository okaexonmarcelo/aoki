(function () {
  "use strict";

  var scriptTag = document.currentScript;
  var API_URL =
    (scriptTag && scriptTag.getAttribute("data-api-url")) ||
    "http://localhost:3000/chat";

  var COLORS = {
    green: "#C8E63C",
    navy: "#0A0A2E",
    greenDark: "#3B6D11",
    greenLight: "#F4FAD4",
  };

  var history = []; // messages tal cual los devuelve el backend — se reenvían sin tocar
  var isOpen = false;
  var isSending = false;

  var style = document.createElement("style");
  style.textContent =
    ".aoki-launcher { position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px; border-radius: 50%;" +
    " background: " + COLORS.navy + "; color: " + COLORS.green + "; border: none; cursor: pointer; font-size: 24px;" +
    " box-shadow: 0 4px 14px rgba(0,0,0,0.25); z-index: 999999; }" +
    ".aoki-panel { position: fixed; bottom: 92px; right: 24px; width: 340px; max-width: calc(100vw - 32px);" +
    " height: 480px; max-height: calc(100vh - 140px); background: #fff; border-radius: 16px; overflow: hidden;" +
    " display: none; flex-direction: column; box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 999999;" +
    ' font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }' +
    ".aoki-panel.aoki-open { display: flex; }" +
    ".aoki-header { background: " + COLORS.navy + "; color: #fff; padding: 14px 16px; font-weight: 600; font-size: 14px; }" +
    ".aoki-header small { display: block; font-weight: 400; opacity: 0.85; font-size: 12px; color: " + COLORS.green + "; margin-top: 2px; }" +
    ".aoki-messages { flex: 1; overflow-y: auto; padding: 12px; background: #f7f7fb; display: flex; flex-direction: column; }" +
    ".aoki-bubble { max-width: 85%; padding: 10px 12px; border-radius: 12px; margin-bottom: 8px; font-size: 13px; line-height: 1.4; white-space: pre-wrap; }" +
    ".aoki-bubble.assistant { background: #fff; border: 1px solid #e5e5ea; align-self: flex-start; }" +
    ".aoki-bubble.user { background: " + COLORS.navy + "; color: #fff; align-self: flex-end; }" +
    ".aoki-ui { margin: 0 0 12px; display: flex; flex-direction: column; gap: 6px; }" +
    ".aoki-option { background: #fff; border: 1px solid #d8dce6; border-radius: 10px; padding: 8px 10px;" +
    " cursor: pointer; font-size: 12px; text-align: left; }" +
    ".aoki-option:hover { border-color: " + COLORS.green + "; }" +
    ".aoki-option.selected { border-color: " + COLORS.greenDark + "; background: " + COLORS.greenLight + "; }" +
    ".aoki-cta { background: " + COLORS.green + "; color: " + COLORS.greenDark + "; border: none; border-radius: 10px;" +
    " padding: 10px; font-weight: 700; cursor: pointer; font-size: 13px; }" +
    ".aoki-input-row { display: flex; border-top: 1px solid #e5e5ea; padding: 8px; gap: 8px; }" +
    ".aoki-input-row input { flex: 1; border: 1px solid #d8dce6; border-radius: 20px; padding: 8px 12px; font-size: 13px; }" +
    ".aoki-input-row button { background: " + COLORS.green + "; color: " + COLORS.greenDark + "; border: none;" +
    " border-radius: 50%; width: 36px; height: 36px; cursor: pointer; flex-shrink: 0; }" +
    ".aoki-typing { font-size: 12px; color: #888; padding: 4px 0 8px; }";
  document.head.appendChild(style);

  var launcher = document.createElement("button");
  launcher.className = "aoki-launcher";
  launcher.type = "button";
  launcher.setAttribute("aria-label", "Abrir chat de Aoki");
  launcher.textContent = "💬";

  var panel = document.createElement("div");
  panel.className = "aoki-panel";
  panel.innerHTML =
    '<div class="aoki-header">Aoki · Agente Oka<small>En línea ahora</small></div>' +
    '<div class="aoki-messages" id="aoki-messages"></div>' +
    '<div class="aoki-input-row">' +
    '<input id="aoki-input" type="text" placeholder="Escribe un mensaje..." />' +
    '<button id="aoki-send" type="button" aria-label="Enviar">➤</button>' +
    "</div>";

  document.body.appendChild(launcher);
  document.body.appendChild(panel);

  var messagesEl = panel.querySelector("#aoki-messages");
  var inputEl = panel.querySelector("#aoki-input");
  var sendBtn = panel.querySelector("#aoki-send");

  launcher.addEventListener("click", function () {
    isOpen = !isOpen;
    panel.classList.toggle("aoki-open", isOpen);
    if (isOpen && messagesEl.childElementCount === 0) {
      appendBubble(
        "assistant",
        "¡Hola! Soy Aoki, tu asistente de Oka. Para ver tu oferta personalizada, ¿cuál es tu DNI?",
      );
    }
  });

  function appendBubble(role, text) {
    var bubble = document.createElement("div");
    bubble.className = "aoki-bubble " + role;
    bubble.textContent = text;
    messagesEl.appendChild(bubble);
    scrollToBottom();
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function clearUi() {
    var existing = messagesEl.querySelector(".aoki-ui");
    if (existing) existing.remove();
  }

  function renderUi(ui) {
    clearUi();
    if (!ui) return;

    var container = document.createElement("div");
    container.className = "aoki-ui";

    if (ui.type === "offer_selector") {
      (ui.options || []).forEach(function (opt) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "aoki-option";
        btn.textContent =
          opt.label +
          " · tasa " +
          opt.interestRate +
          "% · cuota aprox. S/ " +
          opt.approxInstallment;
        btn.addEventListener("click", function () {
          sendMessage(
            "Elijo la oferta de S/ " + opt.amount + " en " + opt.term + " cuotas",
          );
        });
        container.appendChild(btn);
      });
    } else if (ui.type === "insurance_selector") {
      var selected = {};
      (ui.options || []).forEach(function (opt) {
        if (opt.prima == null) return;
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "aoki-option";
        btn.textContent = opt.label + " · S/ " + opt.prima + "/mes";
        btn.addEventListener("click", function () {
          selected[opt.id] = !selected[opt.id];
          btn.classList.toggle("selected", !!selected[opt.id]);
        });
        container.appendChild(btn);
      });

      var confirmBtn = document.createElement("button");
      confirmBtn.type = "button";
      confirmBtn.className = "aoki-cta";
      confirmBtn.textContent = "Confirmar";
      confirmBtn.addEventListener("click", function () {
        var chosen = (ui.options || [])
          .filter(function (o) {
            return selected[o.id];
          })
          .map(function (o) {
            return o.label;
          });
        var text = chosen.length
          ? "Confirmo con seguro " + chosen.join(" y ")
          : "Confirmo sin seguros adicionales";
        sendMessage(text);
      });
      container.appendChild(confirmBtn);
    } else if (ui.type === "onboarding_redirect") {
      var cta = document.createElement("button");
      cta.type = "button";
      cta.className = "aoki-cta";
      cta.textContent = "Crear cuenta para desembolsar";
      cta.addEventListener("click", function () {
        window.location.href = ui.url;
      });
      container.appendChild(cta);
    } else {
      return;
    }

    messagesEl.appendChild(container);
    scrollToBottom();
  }

  function showTyping() {
    var el = document.createElement("div");
    el.className = "aoki-typing";
    el.id = "aoki-typing";
    el.textContent = "Aoki está escribiendo...";
    messagesEl.appendChild(el);
    scrollToBottom();
  }

  function hideTyping() {
    var el = document.getElementById("aoki-typing");
    if (el) el.remove();
  }

  function sendMessage(text) {
    if (isSending || !text) return;
    isSending = true;
    clearUi();
    appendBubble("user", text);
    showTyping();

    var payload = { messages: history.concat([{ role: "user", content: text }]) };

    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        hideTyping();
        history = data.messages || history;
        appendBubble("assistant", data.reply || "...");
        renderUi(data.ui || null);
      })
      .catch(function () {
        hideTyping();
        appendBubble(
          "assistant",
          "Ups, tuve un problema para responder. Intenta de nuevo en un momento.",
        );
      })
      .finally(function () {
        isSending = false;
      });
  }

  sendBtn.addEventListener("click", function () {
    var text = inputEl.value.trim();
    inputEl.value = "";
    sendMessage(text);
  });

  inputEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      var text = inputEl.value.trim();
      inputEl.value = "";
      sendMessage(text);
    }
  });
})();
