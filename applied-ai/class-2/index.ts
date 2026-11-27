
import { MODEL, openRouter } from './src/utils';
import { executeBashCommand, executeSubAgent, getWeather } from './src/tools';
import { 
  convertOutputItemToInput,
  parseBashArguments, 
  parseSearchTerms, 
  parseSubAgentArguments } from './src/helper';

import type {
  InputsUnion1,
  OpenResponsesResult,
  OutputFunctionCallItem,
  ResponsesRequestToolFunction,
} from '@openrouter/sdk/models';
import { compactToolOutput, createContext } from './src/contextManager';
import { planTask } from './src/planerTool';


const instructions = `
    You are a main AI agent and orchestrator.

    You have access to:
    1. getWeather: Get current weather.
    2. bash: Execute shell commands.
    3. delegate_to_subagent: Delegate independent tasks.
    5. For complex multi-step tasks, call plan_task first.
    6. Inspect the generated task plan before executing anything.
    7. Do not execute tasks during the planning stage.
    8. Use the plan to guide subsequent task delegation.
    9. Do not unnecessarily plan simple requests.

    You can delegate tasks to sub-agents.

    Sub-agents can independently delegate their own tasks.
    The maximum delegation depth is 4.
    Delegate independent tasks when doing so improves execution..
`;
const task = `
      The client UI is looking very bad can you improve it add light and dark mode,
      user modern ui but also make sure it does not looks like ai generated
    `;

  const parentContext = createContext("main-agent", {
    parentId: null,
    depth: 0,
    maxDepth: 4
  })

console.log("MAIN CONTEXT:",parentContext)

const input: InputsUnion1[] = [
  {
    role: "user",
    content: task,
  }
];


// tool-definations
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
  },
  {
    type: "function",
    name: "delegate_to_subagent",
    description: `
      Delegate an independent task to a specialized sub-agent.
      Use this when a task requires separate research,
      analysis, or problem solving.
      The sub-agent will return its result.
    `,
    parameters: {
      type: "object",
      properties:{
        subTask: {
          type: "string",
          description: "Detailed task for the sub-agent to complete."
        }
      },
      required: ["subTask"]
    }
  },
  {
    type: "function",
    name: "plan_task",
    description: `
      Create a structured execution plan for a complex user task.
      Break the task into smaller actionable tasks and
      identify dependencies between them.
      Do not execute the tasks.
    `,
    parameters: {
      type: "object",
      properties: {
        userTask: {
          type: "string",
          description: "The original user request that needs planning."
        }
      },
      required: ["userTask"]
    }
  }
];

/**
 *  streaming
 */

async function agentLoop(): Promise<string> {
  while (true) {
    try {
      const stream = await openRouter.responses.send({
        responsesRequest: {
          model: MODEL,
          instructions,
          tools,
          input,
          stream: true,
        },
      });

      console.log("main agent...");

      let finalText = "";
      const completedToolCalls: OutputFunctionCallItem[] = [];
      let completedOutput: OpenResponsesResult["output"] = [];

      for await (const event of stream) {
        if (event.type === "response.output_text.delta") {
          finalText += event.delta;
          process.stdout.write(event.delta);
        }

        if (event.type === "response.output_item.done") {
          if (event.item.type === "function_call") {
            completedToolCalls.push(event.item);
          }
        }

        if (event.type === "response.completed") {
          completedOutput = event.response.output;
        }
      }

      input.push(
        ...completedOutput.map(convertOutputItemToInput)
      );

      if (completedToolCalls.length === 0) {
        return finalText;
      }

      const results = await Promise.all(
        completedToolCalls.map(async (toolCall) => {
          try {
            let result: unknown;

            switch (toolCall.name) {
              case "getWeather": {
                const city = parseSearchTerms(toolCall.arguments);
                result = await getWeather(city);
                break;
              }

              case "bash": {
                const command = parseBashArguments(toolCall.arguments);
                result = await executeBashCommand(command);
                break;
              }

              case "delegate_to_subagent": {
                const subTask = parseSubAgentArguments(toolCall.arguments);
                result = await executeSubAgent(subTask, parentContext);
                break;
              }

              case "plan_task": {
                const args = JSON.parse(toolCall.arguments);
                result = await planTask(args.userTask);
                break;
              }

              default:
                throw new Error(`Unknown tool: ${toolCall.name}`);
            }

            const compactedOutput = await compactToolOutput(
              parentContext.id,
              toolCall.name,
              result
            );

            return {
              type: "function_call_output" as const,
              callId: toolCall.callId,
              output: compactedOutput,
            };

          } catch (error) {
            console.error(`Tool ${toolCall.name} failed:`, error);

            return {
              type: "function_call_output" as const,
              callId: toolCall.callId,
              output: JSON.stringify({
                error: error instanceof Error
                  ? error.message
                  : "Unknown tool error",
              }),
            };
          }
        })
      );

      input.push(...results);

    } catch (error) {
      console.error("Agent loop error:", error);

      console.log("Retrying agent...");
    }
  }
}

agentLoop();




// const instructions1 = `
//     You are a main AI agent.
// `;
// const task1 = `
//       What is the defination of quantum physics.
//     `;

//     const input1: InputsUnion1[] = [
//   {
//     role: "user",
//     content: task1,
//   }
// ];

// const agentLoop2 = async () => {
//     const stream = await openRouter.responses.send({
//       responsesRequest: {
//         model: MODEL,
//         instructions: instructions1,
//         tools,
//         input: input1,
//         stream: true,
//       },
//     });
//     console.log(instructions1, input1)

//     console.log("main agent...")

//     let finalText = "";
//     const completedToolCalls: OutputFunctionCallItem[] = [];
//     let completedOutput: OpenResponsesResult["output"] = [];

//     for await (const event of stream){
//       // stream text to terminal
//       if(event.type === "response.output_text.delta"){
//         finalText += event.delta
//         process.stdout.write(event.delta)
//       }
      
//       // a complete tool call is available
//       if (event.type === "response.output_item.done") {
//         if (event.item.type === "function_call") {
//           completedToolCalls.push(event.item);
//         }
//       }
      
//       // response is complete
//       if (event.type === "response.completed") {
//         console.log(event.response.usage)
//         completedOutput = event.response.output;
//       }
//     }

//     input1.push(...completedOutput.map(convertOutputItemToInput));

  

// }

// agentLoop2();


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

