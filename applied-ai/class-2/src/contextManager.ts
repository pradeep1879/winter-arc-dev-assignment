
type ToolOutput = {
  id: string;
  toolName: string;
  output: string;
};
export type ExecutionBudget = {
  totalAgents: number | null;
  maxAgents: number | null;
};

export type AgentContext = {
  id: string;
  parentId: string | null,
  depth: number,
  maxDepth: number,
  messages: unknown[];
  summary: string;
  budget: ExecutionBudget;
};

export function createContext(
  id: string,
  options?: {
    parentId?: string | null;
    depth?: number;
    maxDepth?: number;
    budget?: ExecutionBudget;
  }
): AgentContext {
  return {
    id,
    parentId: options?.parentId ?? null,
    depth: options?.depth ?? 0,
    maxDepth: options?.maxDepth ?? 4,
    messages: [],
    summary: "",
    budget: options?.budget ?? {
      totalAgents: 1,
      maxAgents: 20
    },
  };
}

export async function offloadToolOutput(
  agentId: string,
  toolOutput: ToolOutput
) {
  const directory = `./agent-storage/${agentId}`;
  await Bun.$`mkdir -p ${directory}`;

  const path = `${directory}/${toolOutput.id}.json`;

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
