import type { z } from "zod";

export interface StandardTool<TInput extends object, TResult extends object> {
  name: "weather" | "poi_search" | "poi_validate";
  description: string;
  inputSchema: z.ZodType<TInput>;
  execute(input: TInput): Promise<TResult>;
  toEvaluationRecord(result: TResult): Record<string, unknown>;
}
