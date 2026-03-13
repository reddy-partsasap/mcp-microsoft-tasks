import { z } from "zod";
import { graphGet } from "../services/graph.js";
import type { PlannerTaskDetails, TodoTask } from "../types.js";

export const GetTaskDetailsInputSchema = z
  .object({
    task_id: z.string().describe("The task ID to retrieve."),
    source: z
      .enum(["planner", "todo"])
      .describe("Where the task lives: 'planner' or 'todo'."),
    list_id: z
      .string()
      .optional()
      .describe("Required for To-Do tasks. The To-Do list ID that contains the task."),
  })
  .strict();

export type GetTaskDetailsInput = z.infer<typeof GetTaskDetailsInputSchema>;

export async function getTaskDetails(
  params: GetTaskDetailsInput
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  if (params.source === "planner") {
    return getPlannerDetails(params.task_id);
  }

  if (!params.list_id) {
    return {
      content: [
        {
          type: "text",
          text: "Error: list_id is required for To-Do tasks. Use list_todo_lists to find list IDs.",
        },
      ],
    };
  }

  return getTodoDetails(params.list_id, params.task_id);
}

async function getPlannerDetails(
  taskId: string
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const details = await graphGet<PlannerTaskDetails>(
    `/planner/tasks/${taskId}/details`
  );

  const checklistItems = Object.values(details.checklist || {}).map((item) => ({
    title: item.title,
    checked: item.isChecked,
  }));

  const references = Object.entries(details.references || {}).map(
    ([url, meta]) => ({
      url,
      alias: meta.alias,
      type: meta.type,
    })
  );

  const output = {
    source: "planner",
    id: details.id,
    description: details.description || "",
    checklist: checklistItems,
    references,
  };

  return {
    content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
  };
}

async function getTodoDetails(
  listId: string,
  taskId: string
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const task = await graphGet<TodoTask>(
    `/me/todo/lists/${listId}/tasks/${taskId}`
  );

  const output = {
    source: "todo",
    id: task.id,
    title: task.title,
    status: task.status,
    importance: task.importance,
    due_date: task.dueDateTime?.dateTime ?? null,
    body: task.body?.content || "",
    body_type: task.body?.contentType || "text",
    linked_resources: (task.linkedResources || []).map((r) => ({
      url: r.webUrl,
      app: r.applicationName,
      name: r.displayName,
    })),
  };

  return {
    content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
  };
}
