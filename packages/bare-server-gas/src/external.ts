import type {
  ChunkFetchResponse,
  ChunkedProxyRequest,
  ChunkedProxyResponse,
  GasTransportRequest,
  GasTransportResponse,
} from "@bare-server-gas/shared";

const MAX_RESPONSE_SIZE = 47_185_920;

export function fetchViaExternal(
  req: GasTransportRequest,
): GasTransportResponse {
  const externalUrl = __EXTERNAL_BARE_URL__;

  const chunkedReq: ChunkedProxyRequest = {
    url: req.url,
    method: req.method,
    headers: req.headers,
    body: req.body,
    maxResponseSize: MAX_RESPONSE_SIZE,
  };

  const baseUrl = externalUrl.endsWith("/") ? externalUrl : `${externalUrl}/`;
  const proxyEndpoint = `${baseUrl}proxy`;

  const response = UrlFetchApp.fetch(proxyEndpoint, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(chunkedReq),
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() !== 200) {
    throw new Error(
      `External bare server error (HTTP ${response.getResponseCode()}): ${response.getContentText()}`,
    );
  }

  const firstResponse = JSON.parse(
    response.getContentText(),
  ) as ChunkedProxyResponse;

  if (!firstResponse.chunk) {
    return {
      status: firstResponse.status,
      statusText: firstResponse.statusText,
      headers: firstResponse.headers,
      body: firstResponse.body,
      encoding: firstResponse.encoding,
    };
  }

  const chunks: string[] = Array.from<string>({
    length: firstResponse.chunk.total,
  });
  chunks[0] = firstResponse.body;

  for (let i = 1; i < firstResponse.chunk.total; i++) {
    const chunkUrl = `${baseUrl}chunk/${firstResponse.chunk.id}/${i}`;

    const chunkResponse = UrlFetchApp.fetch(chunkUrl, {
      method: "get",
      muteHttpExceptions: true,
    });

    if (chunkResponse.getResponseCode() !== 200) {
      throw new Error(
        `Failed to fetch chunk ${i}/${firstResponse.chunk.total}: HTTP ${chunkResponse.getResponseCode()}`,
      );
    }

    const chunkData = JSON.parse(
      chunkResponse.getContentText(),
    ) as ChunkFetchResponse;
    chunks[chunkData.chunk.index] = chunkData.body;
  }

  const fullBody = chunks.join("");

  return {
    status: firstResponse.status,
    statusText: firstResponse.statusText,
    headers: firstResponse.headers,
    body: fullBody,
    encoding: "base64",
  };
}
