import type {
  BareError,
  GasTransportConfig,
  GasTransportRequest,
  GasTransportResponse,
} from "@bare-server-gas/shared";
import { mapFields, unmapFields } from "@bare-server-gas/shared";
import type { ResolvedBareHeaders } from "./meta";

function encodeBase64(input: string): string {
  return btoa(
    new TextEncoder()
      .encode(input)
      .reduce((data, byte) => data + String.fromCharCode(byte), ""),
  );
}

export function decodeBase64(input: string): string {
  const binary = atob(input);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function buildGasRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: string | null,
): GasTransportRequest {
  return {
    url,
    method: method.toUpperCase(),
    headers,
    body,
  };
}

export function encodeGasRequest(
  request: GasTransportRequest,
  config: GasTransportConfig,
): string {
  const mapped = mapFields(
    request as unknown as Record<string, unknown>,
    config.fields,
  );
  const json = JSON.stringify(mapped);
  return encodeBase64(json);
}

export function decodeGasResponse(
  raw: string,
  config: GasTransportConfig,
): GasTransportResponse {
  const json = decodeBase64(raw);
  const parsed = JSON.parse(json) as Record<string, unknown>;
  const canonical = unmapFields(parsed, config.fields);
  return canonical as unknown as GasTransportResponse;
}

export async function sendGasRequest(
  proxyUrl: string,
  url: string,
  method: string,
  headers: Record<string, string>,
  body: string | null,
  config: GasTransportConfig,
): Promise<GasTransportResponse> {
  const request = buildGasRequest(url, method, headers, body);
  const payload = encodeGasRequest(request, config);

  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: payload,
  });

  const responseText = await response.text();

  if (!response.ok) {
    throwBareError(response.status, responseText);
  }

  return decodeGasResponse(responseText, config);
}

export interface StandardBareResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: ArrayBuffer;
}

export async function sendStandardRequest(
  proxyUrl: string,
  url: string,
  method: string,
  headers: Record<string, string>,
  body: string | null,
  bareHeaders: ResolvedBareHeaders,
): Promise<StandardBareResponse> {
  const requestHeaders: Record<string, string> = {
    [bareHeaders.url]: url,
    [bareHeaders.headers]: JSON.stringify(headers),
  };

  const fetchInit: RequestInit = {
    method: method.toUpperCase(),
    headers: requestHeaders,
  };

  if (body !== null && !["GET", "HEAD"].includes(method.toUpperCase())) {
    fetchInit.body = body;
  }

  const response = await fetch(proxyUrl, fetchInit);

  if (!response.ok) {
    const errorText = await response.text();
    throwBareError(response.status, errorText);
  }

  const status = Number.parseInt(
    response.headers.get(bareHeaders.status) ?? String(response.status),
    10,
  );
  const statusText =
    response.headers.get(bareHeaders.statusText) ?? response.statusText;

  let remoteHeaders: Record<string, string> = {};
  const headersJson = response.headers.get(bareHeaders.responseHeaders);
  if (headersJson) {
    try {
      remoteHeaders = JSON.parse(headersJson) as Record<string, string>;
    } catch {}
  }

  const responseBody = await response.arrayBuffer();

  return {
    status,
    statusText,
    headers: remoteHeaders,
    body: responseBody,
  };
}

function throwBareError(httpStatus: number, responseText: string): never {
  let bareError: BareError;
  try {
    bareError = JSON.parse(responseText) as BareError;
  } catch {
    throw new Error(`Bare server error (HTTP ${httpStatus}): ${responseText}`);
  }
  throw new Error(`Bare server error [${bareError.id}]: ${bareError.message}`);
}
