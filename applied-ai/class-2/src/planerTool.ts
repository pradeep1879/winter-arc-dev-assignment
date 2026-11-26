import { z } from "zod";
import { openRouter, MODEL } from "../src/utils";

const plannerInstructions = `
You are an expert task planner.

Your job is to break a user's complex request
into smaller, clear, actionable tasks.

Rules:
1. Break the request into logical tasks.
2. Give every task a unique ID.
3. Each task must have a clear description.
4. Identify task dependencies.
5. Use an empty dependencies array when a task
   has no prerequisites.
6. Do not create unnecessary tasks.
7. Do not execute any tasks.
8. Return only valid JSON.

Expected structure:
{
  "tasks": [
    {
      "id": "task-1",
      "description": "Research application architecture",
      "dependencies": []
    }
  ]
}
`;


export const TaskSchema = z.object({
  id: z.string(),
  description: z.string(),
  dependencies: z.array(z.string()),
});

export const TaskPlanSchema = z.object({
  tasks: z.array(TaskSchema),
});

export type Task = z.infer<typeof TaskSchema>;
export type TaskPlan = z.infer<typeof TaskPlanSchema>;


export async function planTask(
  userTask: string
): Promise<TaskPlan> {

  const response = await openRouter.responses.send({
    responsesRequest: {
      model: MODEL,
      instructions: plannerInstructions,
      input: [
        {
          role: "user",
          content: userTask,
        },
      ],
      stream: false,
    },
  });

  const text = response.output
    .filter((item) => item.type === "message")
    .flatMap((item) =>
      item.content
        .filter((content) => content.type === "output_text")
        .map((content) => content.text)
    )
    .join("\n");

  const parsedPlan = JSON.parse(text);

  const plan = TaskPlanSchema.parse(parsedPlan);

  // Validate dependency references.
  const taskIds = new Set(plan.tasks.map(task => task.id));

  for (const task of plan.tasks) {
    for (const dependency of task.dependencies) {
      if (!taskIds.has(dependency)) {
        throw new Error(
          `Unknown dependency "${dependency}" in ${task.id}`
        );
      }

      if (dependency === task.id) {
        throw new Error(
          `Task "${task.id}" cannot depend on itself`
        );
      }
    }
  }

  return plan;
}
