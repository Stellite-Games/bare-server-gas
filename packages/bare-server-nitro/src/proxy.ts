import { randomUUID } from "node:crypto";
import type {
  ChunkFetchResponse,
  ChunkedProxyRequest,
  ChunkedProxyResponse,
} from "@bare-server-gas/shared";
import { ChunkStore } from "./store";

const DEFAULT_MAX_RESPONSE_SIZE = 47_185_920;

export async function handleProxyRequest(
  body: ChunkedProxyRequest,
  chunkStore: ChunkStore,
): Promise<ChunkedProxyResponse> {
  const { url, method, headers, maxResponseSize } = body;
  const limit =
    maxResponseSize && maxResponseSize > 0
      ? maxResponseSize
      : DEFAULT_MAX_RESPONSE_SIZE;

  const fetchInit: RequestInit = {
    method: method.toUpperCase(),
    headers,
    redirect: "manual",
  };

  if (body.body !== null && !["GET", "HEAD"].includes(method.toUpperCase())) {
    fetchInit.body = body.body;
  }

  const response = await fetch(url, fetchInit);

  const status = response.status;
  const statusText = response.statusText || String(status);

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const fullBase64 = uint8ArrayToBase64(bytes);

  if (fullBase64.length <= limit) {
    const contentType =
      responseHeaders["content-type"] ?? "application/octet-stream";
    const isText = isTextContentType(contentType);

    if (isText && bytes.length <= limit) {
      const textBody = new TextDecoder().decode(bytes);
      return {
        status,
        statusText,
        headers: responseHeaders,
        body: textBody,
        encoding: "utf-8",
      };
    }

    return {
      status,
      statusText,
      headers: responseHeaders,
      body: fullBase64,
      encoding: "base64",
    };
  }

  const chunkSize = Math.floor(limit / 1) & ~3;
  const chunks: string[] = [];
  for (let i = 0; i < fullBase64.length; i += chunkSize) {
    chunks.push(fullBase64.slice(i, i + chunkSize));
  }

  const chunkId = randomUUID();
  const total = chunks.length;

  for (let i = 1; i < total; i++) {
    chunkStore.set(chunkId, i, {
      body: chunks[i],
      chunk: { id: chunkId, index: i, total },
    });
  }

  return {
    status,
    statusText,
    headers: responseHeaders,
    body: chunks[0],
    encoding: "base64",
    chunk: { id: chunkId, index: 0, total },
  };
}

export function handleChunkFetch(
  chunkStore: ChunkStore,
  id: string,
  index: number,
): ChunkFetchResponse | null {
  const stored = chunkStore.get(id, index);
  if (!stored) return null;
  return stored;
}

const TEXT_TYPES = [
  "text/",
  "application/json",
  "application/xml",
  "application/javascript",
  "application/x-www-form-urlencoded",
  "application/xhtml+xml",
  "image/svg+xml",
];

function isTextContentType(contentType: string): boolean {
  const lower = contentType.toLowerCase();
  return TEXT_TYPES.some((t) => lower.includes(t));
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
