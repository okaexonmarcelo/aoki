import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY es requerido"),
  OKA_BASE_URL: z.string().url().default("https://api.oka.com.pe/v1"),
  OKA_TOKEN: z.string().min(1, "OKA_TOKEN es requerido"),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().default("*"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Variables de entorno inválidas:", z.flattenError(parsed.error).fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
