# mcp-microsoft-tasks

A read-only MCP server that surfaces all tasks assigned to the authenticated user across Microsoft 365:

- **Planner** (Loop, Teams, Planner app) — with inline descriptions and checklist summaries
- **To-Do** (personal tasks)
- **Flagged Outlook emails**

## Prerequisites

- **Node.js 18+**
- **Azure CLI** — Install via `brew install azure-cli` (Mac), `winget install Microsoft.AzureCLI` (Windows), or [see docs](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli)
- **Azure CLI login with Graph API scope** — Run:
  ```bash
  az login --scope https://graph.microsoft.com/.default
  ```
- **Admin-consented permissions** — Your Azure AD tenant administrator must grant the Azure CLI app (`04b07795-8ddb-461a-bbee-02f9e1bf7b46`) consent for the following Microsoft Graph delegated permissions:
  - `Tasks.Read` — Required for reading Planner tasks and To-Do tasks
  - `Tasks.Read.All` — Required if you want to read tasks across plans (not just those assigned to you)

  Without these permissions, all Graph API calls will return `401 Unauthorized`. This is a tenant-level setting — individual users cannot grant these scopes on their own. If you're unsure whether your tenant has these permissions enabled, run:
  ```bash
  az account get-access-token --resource https://graph.microsoft.com
  ```
  and decode the JWT at [jwt.ms](https://jwt.ms). Look for `Tasks.Read` in the `scp` (scope) claim. If it's not there, you'll need to request admin consent from your IT administrator.

## Setup

```bash
npm install
npm run build
```

## Claude Code configuration

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "microsoft-tasks": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/mcp-microsoft-tasks/dist/index.js"]
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `list_tasks` | All tasks across Planner, To-Do, and flagged emails (grouped by source) |
| `get_task_details` | Full details for a single task (description, checklist, references) |
| `list_todo_lists` | All To-Do list names, IDs, and types |

## Authentication

Uses Azure CLI for token acquisition — no custom app registration needed. The server shells out to `az account get-access-token --resource https://graph.microsoft.com` and uses the resulting bearer token for all Graph API calls. Works on Windows (`az.cmd`), Mac, and Linux.

If the token is expired or `az` isn't logged in, you'll get a clear error message telling you to run `az login`.

### Troubleshooting auth issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `401 Unauthorized` on all calls | `Tasks.Read` scope not consented | Ask your Azure AD admin to grant consent (see Prerequisites) |
| `az: command not found` | Azure CLI not installed | Install Azure CLI (see Prerequisites) |
| Token fetch fails | Not logged in or session expired | Run `az login --scope https://graph.microsoft.com/.default` |
| Token works but missing scopes | Logged in without Graph scope | Re-login with `az login --scope https://graph.microsoft.com/.default` |
