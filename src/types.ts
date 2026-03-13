// ── Planner types ──

export interface PlannerTask {
  id: string;
  title: string;
  percentComplete: number;
  priority: number;
  dueDateTime: string | null;
  createdDateTime: string;
  startDateTime: string | null;
  planId: string;
  bucketId: string | null;
  orderHint: string;
}

export interface PlannerChecklistItem {
  isChecked: boolean;
  title: string;
}

export interface PlannerTaskDetails {
  id: string;
  description: string;
  checklist: Record<string, PlannerChecklistItem>;
  references: Record<string, { alias: string; type: string }>;
}

// ── To-Do types ──

export interface TodoList {
  id: string;
  displayName: string;
  wellknownListName: "defaultList" | "flaggedEmails" | "none";
  isOwner: boolean;
}

export interface TodoTask {
  id: string;
  title: string;
  status: "notStarted" | "inProgress" | "completed" | "waitingOnOthers" | "deferred";
  importance: "low" | "normal" | "high";
  dueDateTime: { dateTime: string; timeZone: string } | null;
  createdDateTime: string;
  body: { content: string; contentType: string };
  linkedResources: Array<{ webUrl: string; applicationName: string; displayName: string }>;
}

// ── Unified output types ──

export interface UnifiedPlannerTask {
  source: "planner";
  id: string;
  title: string;
  due_date: string | null;
  percent_complete: number;
  priority: string;
  description: string;
  checklist_summary: string;
}

export interface UnifiedTodoTask {
  source: "todo" | "flagged-email";
  id: string;
  list_id: string;
  list_name: string;
  title: string;
  due_date: string | null;
  status: string;
  importance: string;
}

export type UnifiedTask = UnifiedPlannerTask | UnifiedTodoTask;

// ── Priority mapping ──

export const PLANNER_PRIORITY: Record<number, string> = {
  1: "Urgent",
  3: "Important",
  5: "Medium",
  9: "Low",
};

export function plannerPriorityLabel(p: number): string {
  return PLANNER_PRIORITY[p] ?? `Unknown (${p})`;
}
