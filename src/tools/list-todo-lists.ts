import { graphGetAll } from "../services/graph.js";
import type { TodoList } from "../types.js";

const WELL_KNOWN_LABELS: Record<string, string> = {
  defaultList: "Main Tasks list (default)",
  flaggedEmails: "Flagged Outlook emails",
  none: "Custom list",
};

export async function listTodoLists(): Promise<{
  content: Array<{ type: "text"; text: string }>;
}> {
  const lists = await graphGetAll<TodoList>("/me/todo/lists");

  const output = lists.map((list) => ({
    id: list.id,
    name: list.displayName,
    well_known_type: list.wellknownListName,
    type_label: WELL_KNOWN_LABELS[list.wellknownListName] ?? list.wellknownListName,
  }));

  return {
    content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
  };
}
