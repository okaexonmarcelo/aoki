import { z } from "zod";

export interface ToolModule<TName extends string = string, TInput = unknown, TOutput = unknown> {
  definition: {
    name: TName;
    description: string;
    input_schema: Record<string, unknown>;
  };
  schema: z.ZodTypeAny;
  execute(input: TInput): TOutput | Promise<TOutput>;
}

export function defineTool<TName extends string, TSchema extends z.ZodTypeAny, TOutput>(config: {
  name: TName;
  description: string;
  schema: TSchema;
  execute: (input: z.infer<TSchema>) => TOutput | Promise<TOutput>;
}): ToolModule<TName, z.infer<TSchema>, TOutput> {
  return {
    definition: {
      name: config.name,
      description: config.description,
      input_schema: z.toJSONSchema(config.schema, { target: "draft-7" }) as Record<
        string,
        unknown
      >,
    },
    schema: config.schema,
    execute: config.execute,
  };
}
