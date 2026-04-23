import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";

const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY?.trim();
const SILICONFLOW_BASE_URL = process.env.SILICONFLOW_BASE_URL?.trim() || "https://api.siliconflow.cn/v1";
const SILICONFLOW_MODEL = process.env.SILICONFLOW_MODEL?.trim();
const SILICONFLOW_TIMEOUT_MS = Number(process.env.SILICONFLOW_TIMEOUT_MS ?? 12000);

function isOfflineOnly(): boolean {
  return process.env.AGENT_OFFLINE_ONLY?.trim().toLowerCase() === "true";
}

export function isAgentModelConfigured(): boolean {
  return !isOfflineOnly() && Boolean(SILICONFLOW_API_KEY && SILICONFLOW_MODEL);
}

function getProvider() {
  if (!SILICONFLOW_API_KEY) {
    return null;
  }

  return createOpenAI({
    apiKey: SILICONFLOW_API_KEY,
    baseURL: SILICONFLOW_BASE_URL,
    name: "siliconflow",
  });
}

function getModel() {
  const provider = getProvider();
  if (!provider || !SILICONFLOW_MODEL) {
    return null;
  }

  return provider.chat(SILICONFLOW_MODEL);
}

async function withTimeout<T>(task: (abortSignal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SILICONFLOW_TIMEOUT_MS);

  try {
    return await task(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateStructuredObject<T>({
  schema,
  system,
  prompt,
}: {
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
}): Promise<T | null> {
  const model = getModel();
  if (!model) {
    return null;
  }

  try {
    const result = await withTimeout(
      (abortSignal) =>
        generateText({
          model,
          system,
          prompt,
          output: Output.object({
            schema,
          }),
          abortSignal,
        }),
    );
    return result.output;
  } catch {
    return null;
  }
}

export async function generateTextSummary({
  system,
  prompt,
}: {
  system: string;
  prompt: string;
}): Promise<string | null> {
  const model = getModel();
  if (!model) {
    return null;
  }

  try {
    const result = await withTimeout(
      (abortSignal) =>
        generateText({
          model,
          system,
          prompt,
          abortSignal,
        }),
    );
    return result.text.trim() || null;
  } catch {
    return null;
  }
}
