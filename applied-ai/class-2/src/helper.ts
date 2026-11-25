import type {
  InputsUnion1,
  OpenAIResponsesRefusalContent,
  OpenResponsesResult,
  OutputFunctionCallItem,
  OutputMessageItem,
  OutputReasoningItem,
  ResponseOutputText,
  ResponsesRequestToolFunction,
} from '@openrouter/sdk/models';

export function convertOutputItemToInput(
  item: OpenResponsesResult['output'][number],
): InputsUnion1 {
  if (isOutputMessageItem(item)) {
    const content = item.content.filter(isKnownMessageContent);
    if (content.length !== item.content.length) {
      throw new Error('Received an unsupported message content type');
    }
    return { ...item, content };
  }

  if (isFunctionCallOrReasoningItem(item)) {
    return item;
  }

  throw new Error(`Received an unexpected output item: ${item.type}`);
}

export function isOutputMessageItem(
  item: OpenResponsesResult['output'][number],
): item is OutputMessageItem {
  return item.type === 'message';
}

export function isKnownMessageContent(
  content: OutputMessageItem['content'][number],
): content is OpenAIResponsesRefusalContent | ResponseOutputText {
  return content.type === 'output_text' || content.type === 'refusal';
}

export function isFunctionCallOrReasoningItem(
  item: OpenResponsesResult['output'][number],
): item is OutputFunctionCallItem | OutputReasoningItem {
  return item.type === 'function_call' || item.type === 'reasoning';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}



export function parseSearchTerms(argumentsJson: string): string {
  const args: unknown = JSON.parse(argumentsJson);

  if (
    !isRecord(args) ||
    !isString(args.city)
  ) {
    throw new Error('Invalid arguments for getWeather');
  }

  return args.city;
}

export function parseBashArguments(argumentsJson: string): string {
  const args: unknown = JSON.parse(argumentsJson);

  if (!isRecord(args) || !isString(args.command)) {
    throw new Error("Invalid arguments for bash");
  }

  return args.command;
}


export function parseSubAgentArguments(argumentsJson: string): string {
  const args: unknown = JSON.parse(argumentsJson);

  if (!isRecord(args) || !isString(args.subTask)) {
    throw new Error("Invalid sub-agent arguments");
  }

  return args.subTask;
}