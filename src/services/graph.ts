import { getAccessToken } from "./auth.js";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export interface GraphError {
  code: string;
  message: string;
}

/**
 * Make an authenticated GET request to Microsoft Graph.
 */
export async function graphGet<T>(path: string): Promise<T> {
  const token = await getAccessToken();
  const url = `${GRAPH_BASE}${path}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    let detail: string;
    try {
      const err = JSON.parse(body) as { error?: GraphError };
      detail = err.error?.message ?? body;
    } catch {
      detail = body;
    }
    throw new Error(`Graph API ${res.status}: ${detail}`);
  }

  return (await res.json()) as T;
}

/**
 * Fetch all pages of a Graph collection endpoint.
 */
export async function graphGetAll<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  let url: string | null = `${GRAPH_BASE}${path}`;

  while (url) {
    const token = await getAccessToken();
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const body = await res.text();
      let detail: string;
      try {
        const err = JSON.parse(body) as { error?: GraphError };
        detail = err.error?.message ?? body;
      } catch {
        detail = body;
      }
      throw new Error(`Graph API ${res.status}: ${detail}`);
    }

    const data = (await res.json()) as {
      value: T[];
      "@odata.nextLink"?: string;
    };
    items.push(...data.value);
    url = data["@odata.nextLink"] ?? null;
  }

  return items;
}
