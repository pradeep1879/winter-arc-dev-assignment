import { OpenRouter } from "@openrouter/sdk";

const OPENROUTER_API_KEY = process.env.API_KEY;

// you can use any model that supports tool calling
export const MODEL = "anthropic/claude-sonnet-5.5";

export const openRouter = new OpenRouter({
  apiKey: OPENROUTER_API_KEY,
});