
type ToolOutput = {
  id: string;
  toolName: string;
  output: string;
};

export type AgentContext = {
  id: string;
  messages: unknown[];
  summary: string;
};

export function createContext(id: string): AgentContext {
  return {
    id,
    messages: [],
    summary: "",
  };
}

export async function offloadToolOutput(
  agentId: string,
  toolOutput: ToolOutput
) {
  const directory = `./agent-storage/${agentId}`;

  const path = `${directory}/${toolOutput.id}.json`;

  await Bun.$`mkdir -p ${directory}`;

  await Bun.write(
    path,
    JSON.stringify(toolOutput, null, 2)
  );

  return {
    type: "offloaded",
    toolName: toolOutput.toolName,
    reference: path,
    message: `Original output saved at ${path}`,
  };
}

export async function compactToolOutput(
  agentId: string,
  toolName: string,
  output: unknown,
  threshold = 10_000
): Promise<string> {

  const serialized = JSON.stringify(output)

  if (serialized.length <= threshold) {
    return serialized;
  }
console.log("Compacting context:", agentId);
console.log("Output size:", serialized.length);

  const reference = await offloadToolOutput(agentId, {
    id: crypto.randomUUID(),
    toolName,
    output: serialized,
  });

  return JSON.stringify(reference);
}
