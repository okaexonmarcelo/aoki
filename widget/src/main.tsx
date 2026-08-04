import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Widget } from "./Widget";

const scriptTag = document.currentScript as HTMLScriptElement | null;
const apiUrl = scriptTag?.getAttribute("data-api-url") || "http://localhost:3000/chat";

const container = document.createElement("div");
document.body.appendChild(container);

createRoot(container).render(
  <StrictMode>
    <Widget apiUrl={apiUrl} />
  </StrictMode>,
);
