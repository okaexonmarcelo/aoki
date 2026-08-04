import express, { type Request, type Response } from "express";
import { z } from "zod";
import { runConversation, type RunConversationResult } from "../agent/orchestrator";

const router = express.Router();

const chatRequestSchema = z.object({
  messages: z.array(z.looseObject({ role: z.string() })).min(1, "messages requerido"),
});

router.post("/chat", async (req: Request, res: Response): Promise<void> => {
  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "messages requerido" });
    return;
  }

  try {
    const { reply, ui, messages: updatedMessages }: RunConversationResult =
      await runConversation(parsed.data.messages as RunConversationResult["messages"]);
    res.json({ reply, ui, messages: updatedMessages });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Aoki error:", message);
    res.status(500).json({ error: "Error interno del agente" });
  }
});

export default router;
