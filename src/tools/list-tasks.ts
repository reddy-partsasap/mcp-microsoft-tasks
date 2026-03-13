import { z } from "zod";
import { graphGet, graphGetAll } from "../services/graph.js";
import type {
  PlannerTask,
  PlannerTaskDetails,
  TodoList,
  TodoTask,
  UnifiedPlannerTask,
  UnifiedTodoTask,
  UnifiedTask,
} from "../types.js";
import { plannerPriorityLabel } from "../types.js";

export const ListTasksInputSchema = z
  .object({
    include_completed: z
      .boolean()
      .default(false)
      .describe("Include completed tasks. Defaults to false (active tasks only)."),
  })
  .strict();

export type ListTasksInput = z.infer<typeof ListTasksInputSchema>;

export async function listTasks(
  params: ListTasksInput
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const [plannerTasks, todoLists] = await Promise.all([
    fetchPlannerTasks(params.include_completed),
    graphGetAll<TodoList>("/me/todo/lists"),
  ]);

  const todoResults = await fetchAllTodoTasks(todoLists, params.include_completed);

  const output = {
    planner_tasks: plannerTasks,
    todo_tasks: todoResults.todo,
    flagged_emails: todoResults.flagged,
    summary: {
      planner_count: plannerTasks.length,
      todo_count: todoResults.todo.length,
      flagged_email_count: todoResults.flagged.length,
      total: plannerTasks.length + todoResults.todo.length + todoResults.flagged.length,
    },
  };

  return {
    content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
  };
}

async function fetchPlannerTasks(
  includeCompleted: boolean
): Promise<UnifiedPlannerTask[]> {
  const tasks = await graphGetAll<PlannerTask>("/me/planner/tasks");

  const filtered = includeCompleted
    ? tasks
    : tasks.filter((t) => t.percentComplete < 100);

  // Fetch details for each task (N+1 — Graph has no batch for /details)
  const results = await Promise.allSettled(
    filtered.map(async (task): Promise<UnifiedPlannerTask> => {
      let description = "";
      let checklistSummary = "";

      try {
        const details = await graphGet<PlannerTaskDetails>(
          `/planner/tasks/${task.id}/details`
        );
        description = details.description || "";
        const items = Object.values(details.checklist || {});
        if (items.length > 0) {
          const done = items.filter((i) => i.isChecked).length;
          checklistSummary = `${done}/${items.length} complete`;
        }
      } catch {
        // Details may 404 for some tasks — non-fatal
      }

      return {
        source: "planner",
        id: task.id,
        title: task.title,
        due_date: task.dueDateTime,
        percent_complete: task.percentComplete,
        priority: plannerPriorityLabel(task.priority),
        description,
        checklist_summary: checklistSummary,
      };
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<UnifiedPlannerTask> => r.status === "fulfilled")
    .map((r) => r.value);
}

async function fetchAllTodoTasks(
  lists: TodoList[],
  includeCompleted: boolean
): Promise<{ todo: UnifiedTodoTask[]; flagged: UnifiedTodoTask[] }> {
  const todo: UnifiedTodoTask[] = [];
  const flagged: UnifiedTodoTask[] = [];

  const results = await Promise.allSettled(
    lists.map(async (list) => {
      const tasks = await graphGetAll<TodoTask>(
        `/me/todo/lists/${list.id}/tasks`
      );

      const filtered = includeCompleted
        ? tasks
        : tasks.filter((t) => t.status !== "completed");

      return filtered.map((task): UnifiedTodoTask => {
        const source = list.wellknownListName === "flaggedEmails" ? "flagged-email" as const : "todo" as const;
        return {
          source,
          id: task.id,
          list_id: list.id,
          list_name: list.displayName,
          title: task.title,
          due_date: task.dueDateTime?.dateTime ?? null,
          status: task.status,
          importance: task.importance,
        };
      });
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const task of result.value) {
        if (task.source === "flagged-email") {
          flagged.push(task);
        } else {
          todo.push(task);
        }
      }
    }
  }

  return { todo, flagged };
}
