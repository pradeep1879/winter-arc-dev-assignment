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
import { OpenRouter } from '@openrouter/sdk';
import { stderr } from 'bun';

const OPENROUTER_API_KEY = process.env.API_KEY;

// You can use any model that supports tool calling
const MODEL = "google/gemini-3-flash-preview";

const openRouter = new OpenRouter({
  apiKey: OPENROUTER_API_KEY,
});

const instructions = "You are a helpful assistant.";
const task = "Show me all files in the current directory using bash. tell me the contents of index.ts file";

const input: InputsUnion1[] = [
  {
    role: "user",
    content: task,
  }
];

function convertOutputItemToInput(
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

function isOutputMessageItem(
  item: OpenResponsesResult['output'][number],
): item is OutputMessageItem {
  return item.type === 'message';
}

function isKnownMessageContent(
  content: OutputMessageItem['content'][number],
): content is OpenAIResponsesRefusalContent | ResponseOutputText {
  return content.type === 'output_text' || content.type === 'refusal';
}

function isFunctionCallOrReasoningItem(
  item: OpenResponsesResult['output'][number],
): item is OutputFunctionCallItem | OutputReasoningItem {
  return item.type === 'function_call' || item.type === 'reasoning';
}



export async function getWeather(city: string): Promise<string> {
  console.log("getWeather tool called")
  const response = await fetch(
    `https://wttr.in/${encodeURIComponent(city)}?format=%t`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch temperature for "${city}"`);
  }

  return (await response.text()).trim();
}

export async function executeBashCommand(command: string) {
  console.log(`Running command: ${command}`);

  try {
    const result = await Bun.$`bash -lc ${command}`;

    return {
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
      exitCode: result.exitCode,
    };

  } catch (error) {
    return {
      stdout: "",
      stderr: error instanceof Error
        ? error.message
        : "Unknown error",
      exitCode: 1,
    };
  }
}


const tools: ResponsesRequestToolFunction[] = [
  {
    type: 'function',
    name: 'getWeather',
    description: 'Get the current weather of a city.',
    parameters: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: 'Name of the city',
        },
      },
      required: ['city'],
    },
  },
  {
    type: "function",
    name: "bash",
    description: "Run the bash command.",
    parameters:{
      type: 'object',
      properties: {
        command: {
          type: "string",
          description: "bash command to run."
        }
      },
      required: ["command"]
    }
  }
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function parseSearchTerms(argumentsJson: string): string {
  const args: unknown = JSON.parse(argumentsJson);

  if (
    !isRecord(args) ||
    !isString(args.city)
  ) {
    throw new Error('Invalid arguments for getWeather');
  }

  return args.city;
}

function parseBashArguments(argumentsJson: string): string {
  const args: unknown = JSON.parse(argumentsJson);

  if (!isRecord(args) || !isString(args.command)) {
    throw new Error("Invalid arguments for bash");
  }

  return args.command;
}


// async function agentLoop(): Promise<string> {
//   while (true) {
//     const response = await openRouter.responses.send({
//       responsesRequest: {
//         model: MODEL,
//         instructions,
//         tools,
//         input,
//         stream: false,
//       },
//     });

//     const toolCalls = response.output.filter(
//       (item): item is OutputFunctionCallItem =>
//         item.type === "function_call"
//     );

//     input.push(...response.output.map(convertOutputItemToInput));

//     if (toolCalls.length === 0) {
//       const message = [...response.output]
//         .reverse()
//         .find((item) => item.type === "message");

//       const finalText = message?.content.find(
//         (part) => part.type === "output_text"
//       );

//       return finalText?.text ?? "No response generated";
//     }

//     const results = await Promise.all(
//       toolCalls.map(async (toolCall) => {
//         if (toolCall.name !== "getWeather") {
//           throw new Error(`Unknown tool: ${toolCall.name}`);
//         }

//         const city = parseSearchTerms(toolCall.arguments);
//         const result = await getWeather(city);

//         return {
//           type: "function_call_output" as const,
//           callId: toolCall.callId,
//           output: JSON.stringify(result),
//         };
//       })
//     );

//     input.push(...results);
//   }
// }

// const answer = await agentLoop();
// console.log(answer);



/**
 *  streaming
 */



async function agentLoop(): Promise<string> {
  while (true) {
    const stream = await openRouter.responses.send({
      responsesRequest: {
        model: MODEL,
        instructions,
        tools,
        input,
        stream: true,
      },
    });

    let finalText = "";
    const completedToolCalls: OutputFunctionCallItem[] = [];
    let completedOutput: OpenResponsesResult["output"] = [];

    for await (const event of stream){
      // stream text to terminal
      if(event.type === "response.output_text.delta"){
        finalText += event.delta
        process.stdout.write(event.delta)
      }

       // a complete tool call is available
      if (event.type === "response.output_item.done") {
        if (event.item.type === "function_call") {
          completedToolCalls.push(event.item);
        }
      }

      // response is complete
      if (event.type === "response.completed") {
        completedOutput = event.response.output;
      }
    }

    input.push(...completedOutput.map(convertOutputItemToInput));

    if (completedToolCalls.length === 0) {
      return finalText
    }

    const results = await Promise.all(
      completedToolCalls.map(async (toolCall) => {
        let result: unknown;

        switch(toolCall.name){
          
          case "getWeather": {
            const city = parseSearchTerms(toolCall.arguments);
            result = await getWeather(city);

            break;
          }

          case "bash": {
            const command  = parseBashArguments(toolCall.arguments)
            result = await executeBashCommand(command);

            break;
          }
        }

        return {
          type: "function_call_output" as const,
          callId: toolCall.callId,
          output: JSON.stringify(result),
        };
      })
    );

    input.push(...results);
  }
}

agentLoop();