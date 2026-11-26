import { OpenRouter } from '@openrouter/sdk';
 
import { responseOutputTextFromJSON, toolCallFromJSON, type InputsUnion1, type OpenAIResponsesRefusalContent, type OpenResponsesResult, type OutputFunctionCallItem, type OutputMessageItem, type OutputReasoningItem, type ResponseOutputText, type ResponsesRequestToolFunction } from '@openrouter/sdk/models';
// 1. Give it access to a weather tool (2 step request) (15 minutes)
// 2. Give it access to the bash tool (2 step request)
// 3. Write the agent loop
 
/// 1. streaming, 2. web_search, 3. create_sub_agent (depth - 4)
/// context eng
 
const bashExecute = async (command: string) => {
  console.log("running command " + command);
  try {
    const result = await Bun.$`bash -lc ${command}`
    .cwd(__dirname)
    const stdout = result.stdout.toString();
 
    return {
      stdout
    };
  } catch(e) {
    return {
      stdout: "",
      stderr: "Error while running command"
    }
  }
}
 
const tools: ResponsesRequestToolFunction[] = [
  { 
    type: "function",
    name: "bash",
    description: "Runs a bash command",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The bash command to run"
        }
      },
      required: ["command"]
    }
  }
]
 
 
const client = new OpenRouter({
  apiKey: process.env.API_KEY,
});
 
 
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
 
 
 
const inputs: InputsUnion1[] = [{
  content: "Explore this repo to tell me what it does",
  role: "user"
}]
 
while(1) {
  const response = await client.responses.send({
    responsesRequest: {
      model: 'openai/gpt-5.2',
      input: inputs,
      stream: false,
      tools
    },
  });
 
  const toolcalls = response.output.filter(x => x.type === "function_call")
 
  if (toolcalls.length === 0) {
    if (!('output' in response)) {
      throw new Error('Expected a non-streaming response');
    }
 
    const finalMessage = [...response.output].reverse().find((item) => item.type === 'message');
    console.log(finalMessage?.content.find((part) => part.type === 'output_text')?.text);
    break;
  }
 
  // inputs.push(...response.output.map(x => (x)))
 
  for (const toolcall of toolcalls) {
    if (toolcall.name != "bash") {
      throw new Error("Tool not found")
    }
 
    const command = JSON.parse(toolcall.arguments).command;
    const bashResult = await bashExecute(command);
    inputs.push({
      type: 'function_call_output',
      callId: toolcall.callId,
      output: JSON.stringify(bashResult),
    });
  }
 
 
}