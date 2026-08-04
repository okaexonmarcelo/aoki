import { env } from "./config/env";

import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import chatRoutes from "./routes/chat.routes";

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes, intenta de nuevo en un momento." },
});

app.use("/chat", chatLimiter);
app.use(chatRoutes);

app.listen(env.PORT, () => {
  console.log(`Aoki backend corriendo en :${env.PORT}`);
});
