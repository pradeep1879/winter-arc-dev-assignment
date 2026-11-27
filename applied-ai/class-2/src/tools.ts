import type { InputsUnion1, OutputFunctionCallItem, ResponsesRequestToolFunction } from "@openrouter/sdk/models";
import { compactToolOutput, createContext, type AgentContext } from "./contextManager";
import { MODEL, openRouter } from "./utils";
import { convertOutputItemToInput, parseBashArguments, parseSubAgentArguments } from "./helper";

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

type BashOptions = {
  background?: boolean;
};

export async function executeBashCommand(
  command: string,
  options: BashOptions = {},
) {
  console.log(`Running command: ${command}`);

  try {
    if (options.background) {
      const script = `(${command}) > server.log 2>&1 < /dev/null & echo $!`;

      const result = await Bun.$`bash -lc ${script}`;

      return {
        stdout: `Process started with PID: ${result.stdout.toString().trim()}`,
        stderr: result.stderr.toString(),
        exitCode: 0,
        background: true,
      };
    }

    const result = await Bun.$`bash -lc ${command}`;

    return {
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
      exitCode: result.exitCode,
      background: false,
    };
  } catch (error) {
    return {
      stdout: "",
      stderr: error instanceof Error ? error.message : "Unknown error",
      exitCode: 1,
      background: false,
    };
  }
}

const bashTool: ResponsesRequestToolFunction = {
  type: "function",
  name: "bash",
  description: "Execute a shell command.",
  parameters: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "Bash command to execute."
      }
    },
    required: ["command"]
  }
};


const delegateTool: ResponsesRequestToolFunction = {
  type: "function",
  name: "delegate_to_subagent",
  description: `
    Delegate an independent task to a specialized child agent.
    The child agent can use Bash and delegate its own tasks
    if its depth allows.
  `,
  parameters: {
    type: "object",
    properties: {
      subTask: {
        type: "string",
        description: "Detailed task for the child agent."
      }
    },
    required: ["subTask"]
  }
};


function getSubAgentTools(
  context: AgentContext
): ResponsesRequestToolFunction[] {
  const canDelegate =
    context.depth < context.maxDepth;

  console.log(
    `[TOOLS] Agent ${context.id} | Depth: ${context.depth} | Can delegate: ${canDelegate}`
  );

  const tools = [bashTool];

  if (canDelegate) {
    tools.push(delegateTool);
  }

  return tools;
}


const executeSubAgentTool = async (
  toolCall: OutputFunctionCallItem,
  context: AgentContext
) => {
  console.log("\n EXECUTING TOOL ");
  console.log("Agent:", context.id);
  console.log("Depth:", context.depth);
  console.log("Tool:", toolCall.name);
  console.log("Arguments:", toolCall.arguments);
  

  switch (toolCall.name) {

    case "bash": {
      const command = parseBashArguments(
        toolCall.arguments
      );

      return await executeBashCommand(command);
    }

    case "delegate_to_subagent": {
      const subTask = parseSubAgentArguments(
        toolCall.arguments
      );

      console.log(
        `[DELEGATION] ${context.id} (depth ${context.depth}) spawning child`
      );

      return await executeSubAgent(
        subTask,
        context
      );
    }

    default:
      throw new Error(
        `Unknown sub-agent tool-call: ${toolCall.name}`
      );
  }
};



export async function executeSubAgent(
  subTask: string,
  parentContext: AgentContext
) {
  if (parentContext.depth >= parentContext.maxDepth) {
    throw new Error("Maximum agent depth reached");
  }

  if (
    parentContext.budget.totalAgents! >=
    parentContext.budget.maxAgents!
  ) {
    throw new Error("Maximum agent count reached");
  }

  parentContext.budget.totalAgents!++;

  const subAgentContext = createContext(
    `subagent-${crypto.randomUUID()}`,
    {
      parentId: parentContext.id,
      depth: parentContext.depth + 1,
      maxDepth: parentContext.maxDepth,
      budget: parentContext.budget,
    }
  );

  const subAgentInput: InputsUnion1[] = [
    {
      role: "user",
      content: subTask,
    },
  ];

  let retries = 0;
  const MAX_RETRIES = 3;

  while (true) {
    try {
      const response = await openRouter.responses.send({
        responsesRequest: {
          model: MODEL,
          instructions: `
            You are a specialized sub-agent.

            Your agent ID: ${subAgentContext.id}
            Your parent ID: ${subAgentContext.parentId}
            Your depth: ${subAgentContext.depth}
            Maximum depth: ${subAgentContext.maxDepth}

            Complete only the task assigned to you.
            You can delegate independent subtasks.
            Return your final result to your parent agent.
          `,
          input: subAgentInput,
          tools: getSubAgentTools(subAgentContext),
          stream: false,
        },
      });

      // Model response received successfully
      retries = 0;

      subAgentInput.push(
        ...response.output.map(convertOutputItemToInput)
      );

      const toolCalls = response.output.filter(
        (item) => item.type === "function_call"
      );

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

      for (const toolCall of toolCalls) {
        try {
          const rawResult = await executeSubAgentTool(
            toolCall,
            subAgentContext
          );

          const result = await compactToolOutput(
            subAgentContext.id,
            toolCall.name,
            rawResult
          );

          subAgentInput.push({
            type: "function_call_output",
            callId: toolCall.callId,
            output: JSON.stringify(result),
          });

        } catch (error) {
          console.error(
            `[SUBAGENT TOOL ERROR] ${toolCall.name}:`,
            error
          );

          subAgentInput.push({
            type: "function_call_output",
            callId: toolCall.callId,
            output: JSON.stringify({
              error: error instanceof Error
                ? error.message
                : "Unknown tool error",
            }),
          });
        }
      }

    } catch (error) {
      retries++;

      console.error(
        `[SUBAGENT ERROR] ${subAgentContext.id}`,
        error
      );

      if (retries >= MAX_RETRIES) {
        throw error;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 2000 * retries)
      );
    }
  }
}
