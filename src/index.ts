#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { ListTasksInputSchema, listTasks } from "./tools/list-tasks.js";
import {
  GetTaskDetailsInputSchema,
  getTaskDetails,
} from "./tools/get-task-details.js";
import { listTodoLists } from "./tools/list-todo-lists.js";

const server = new McpServer({
  name: "mcp-microsoft-tasks",
  version: "1.0.0",
});

// ── list_tasks ──
server.registerTool(
  "list_tasks",
  {
    title: "List All Microsoft Tasks",
    description: `Returns all tasks assigned to the authenticated user across Planner, To-Do, and flagged Outlook emails in a single unified response grouped by source.

Includes: source type (planner/todo/flagged-email), title, due date, status/percent complete, priority. Planner tasks also include description and checklist summary.

Completed tasks are excluded by default. Pass include_completed=true to include them.

Returns JSON with keys: planner_tasks, todo_tasks, flagged_emails, summary.`,
    inputSchema: {
      include_completed: ListTasksInputSchema.shape.include_completed,
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async (params) => {
    try {
      return await listTasks(ListTasksInputSchema.parse(params));
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

// ── get_task_details ──
server.registerTool(
  "get_task_details",
  {
    title: "Get Task Details",
    description: `Returns full details for a single task given its ID and source type.

For Planner tasks: description, checklist items (title + checked state), and references (URLs).
For To-Do tasks: body content, linked resources.

Args:
  - task_id (string): The task ID
  - source ('planner' | 'todo'): Where the task lives
  - list_id (string, optional): Required for To-Do tasks — the list ID containing the task`,
    inputSchema: {
      task_id: GetTaskDetailsInputSchema.shape.task_id,
      source: GetTaskDetailsInputSchema.shape.source,
      list_id: GetTaskDetailsInputSchema.shape.list_id,
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async (params) => {
    try {
      return await getTaskDetails(GetTaskDetailsInputSchema.parse(params));
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

// ── list_todo_lists ──
server.registerTool(
  "list_todo_lists",
  {
    title: "List To-Do Lists",
    description: `Returns all Microsoft To-Do list names and IDs for the authenticated user.

Each list includes a well_known_type field:
  - "defaultList" — the main Tasks list
  - "flaggedEmails" — Outlook flagged emails
  - "none" — custom lists created by the user

Useful for discovering list IDs needed by get_task_details.`,
    inputSchema: {},
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async () => {
    try {
      return await listTodoLists();
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

// ── Start ──
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mcp-microsoft-tasks running via stdio");
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});
