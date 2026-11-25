import type { InputsUnion1, OutputFunctionCallItem, ResponsesRequestToolFunction } from "@openrouter/sdk/models";
import { compactToolOutput, createContext } from "./contextManager";
import { MODEL, openRouter } from "./utils";
import { convertOutputItemToInput, parseBashArguments } from "./helper";

// tool-functions
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


const executeSubAgentTool = async (toolCall: OutputFunctionCallItem) => {
  switch(toolCall.name){
    case "bash": {
      const command = parseBashArguments(toolCall.arguments);

      return await executeBashCommand(command);
    }

    default: 
      throw new Error(`Unknown sub-agent tool-call ${toolCall.name}`)
  }
}

const subAgentTools: ResponsesRequestToolFunction[] = [
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
  },
];

export async function subAgent(subTask: string) {
  console.log(`spawning a new sub-agent...`);


   const subAgentContext = createContext(
    `subagent-${crypto.randomUUID()}`
  );

  // 2. Create its own conversation input
  const subAgentInput: InputsUnion1[] = [
    {
      role: "user",
      content: subTask,
    },
  ];

console.log("Sub-agent context:", subAgentContext.id);
console.log("Sub-agent task:", subTask);

while(true){
  const response = await openRouter.responses.send({
    responsesRequest:{
      model: MODEL,

      instructions: `
        You are a specialized sub-agent.
        Complete only the task assigned to you.
        Be accurate and return a concise result.
      `,
      input: subAgentInput,
      tools: subAgentTools,
      stream: false
    }
  })

  subAgentInput.push(...response.output.map(convertOutputItemToInput))

  const toolCalls = response.output.filter((item) => item.type === "function_call");

   if (toolCalls.length === 0) {
      return response.output
        .filter((item) => item.type === "message")
        .flatMap((item) =>
          item.content
            .filter((content) => content.type === "output_text")
            .map((content) => content.text)
        )
        .join("\n");
    }

    for(const toolCall of toolCalls){
      const rawResult = await executeSubAgentTool(toolCall);

      const result = await compactToolOutput(
        subAgentContext.id,
        toolCall.name,
        rawResult
      );

      subAgentInput.push({
        type: "function_call_output",
        callId: toolCall.callId,
        output: JSON.stringify(result),
      })
    }
} 
}