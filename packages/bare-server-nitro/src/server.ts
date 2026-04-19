import { H3, HTTPError, readBody } from "h3";
import type { ChunkedProxyRequest } from "@bare-server-gas/shared";
import { handleChunkFetch, handleProxyRequest } from "./proxy";
import { ChunkStore } from "./store";

export interface BareServerOptions {
  prefix?: string;

  chunkTtlSeconds?: number;
}

export function createBareServer(options: BareServerOptions = {}): H3 {
  const prefix = options.prefix ?? "/";
  const base = prefix.endsWith("/") ? prefix : `${prefix}/`;
  const chunkStore = new ChunkStore(options.chunkTtlSeconds ?? 300);

  const app = new H3();

  app.get(`${base}`, () => {
    return {
      versions: ["v4"],
      language: "TypeScript",
      project: {
        name: "@bare-server-gas/nitro",
        description: "External bare server with chunked-transport support",
        version: "0.1.0",
      },
      chunkedTransport: true,
    };
  });

  app.post(`${base}proxy`, async (event) => {
    const body = (await readBody(event)) as ChunkedProxyRequest;

    if (!body || typeof body.url !== "string" || !body.url) {
      throw new HTTPError("Missing or invalid 'url' field", { status: 400 });
    }

    if (!body.method || typeof body.method !== "string") {
      throw new HTTPError("Missing or invalid 'method' field", { status: 400 });
    }

    try {
      return await handleProxyRequest(body, chunkStore);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      throw new HTTPError(`Proxy fetch failed: ${message}`, { status: 502 });
    }
  });

  app.get(`${base}chunk/:id/:index`, (event) => {
    const { id, index: indexStr } = event.context.params as {
      id: string;
      index: string;
    };
    const index = Number.parseInt(indexStr, 10);

    if (Number.isNaN(index) || index < 0) {
      throw new HTTPError("Invalid chunk index", { status: 400 });
    }

    const chunk = handleChunkFetch(chunkStore, id, index);
    if (!chunk) {
      throw new HTTPError(`Chunk not found: ${id}/${index}`, { status: 404 });
    }

    return chunk;
  });

  return app;
}
