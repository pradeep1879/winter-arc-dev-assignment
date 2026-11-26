
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
    Create a folder named "recursive-agent-test".

    The main agent (depth 0) MUST create exactly two sub-agents:

    **Sub-agent A — Depth 1**
    - Responsible for creating the "Backend" folder.
    - Must delegate one task to another sub-agent at depth 2.
    - That agent must delegate another task to an agent at depth 3.
    - The depth 3 agent must delegate another task to an agent at depth 4.
    - The depth 4 agent must create a "README.md" file inside the Backend folder.
    
    **Sub-agent B — Depth 1**
    - Responsible for creating the "Client" folder.
    - Must delegate one task to another sub-agent at depth 2.
    - That agent must delegate another task to an agent at depth 3.
    - The depth 3 agent must delegate another task to an agent at depth 4.
    - The depth 4 agent must create an "index.html" file inside the Client folder.

    **Rules:**
    1. Every agent must delegate to exactly one child agent if its depth is less than 4.
    2. No agent at depth 4 is allowed to create another sub-agent.
    3. Every agent must perform its assigned task using the Bash tool.
    4. Each child must return its result to its immediate parent.
    5. The main agent must wait for both branches to finish.
    6. Finally, verify the folder structure using Bash and report the agent hierarchy, IDs, and depths.
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
    const stream = await openRouter.responses.send({
      responsesRequest: {
        model: MODEL,
        instructions,
        tools,
        input,
        stream: true,
      },
    });

    console.log("main agent...")

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

          case "delegate_to_subagent" :{
            const subTask = parseSubAgentArguments(toolCall.arguments)
            result = await executeSubAgent(subTask, parentContext)
            break;
          }

          case "plan_task": {
            const args = JSON.parse(toolCall.arguments);
            result = await planTask(args.userTask);
            break;

          }
        }


        const compactedOutput = await compactToolOutput(
          parentContext.id, 
          toolCall.name, 
          result
        )

        return {
          type: "function_call_output" as const,
          callId: toolCall.callId,
          output: compactedOutput,
        };
      })
    );

    input.push(...results);
  }
}

agentLoop();




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

