import type {
  GasTransportRequest,
  GasTransportResponse,
} from "@bare-server-gas/shared";
import { type FieldMap, mapFields, unmapFields } from "@bare-server-gas/shared";
import { badRequest, internalError } from "./errors";
import { fetchViaExternal } from "./external";

/** Content-Type values considered textual (body returned as utf-8). */
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

/**
 * Decode, unmap, and validate the incoming gas-transport request.
 *
 * Wire format: the POST body is a base64 string that decodes to a
 * JSON object whose keys are the obfuscated field names from __FIELD_MAP__.
 */
function parseRequest(
  raw: string,
): GasTransportRequest | GoogleAppsScript.Content.TextOutput {
  // 1. Base64-decode the envelope
  let json: string;
  try {
    const bytes = Utilities.base64Decode(raw);
    json = Utilities.newBlob(bytes).getDataAsString();
  } catch {
    return badRequest("Failed to decode request envelope");
  }

  // 2. Parse the JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return badRequest("Invalid JSON in request body");
  }

  // 3. Reverse field name mapping (obfuscated -> canonical)
  const canonical = unmapFields(
    parsed as Record<string, unknown>,
    __FIELD_MAP__ as unknown as FieldMap,
  );

  // 4. Validate canonical fields
  if (
    typeof canonical["url"] !== "string" ||
    (canonical["url"] as string).length === 0
  ) {
    return badRequest("Missing or invalid 'url' field");
  }

  if (
    typeof canonical["method"] !== "string" ||
    (canonical["method"] as string).length === 0
  ) {
    return badRequest("Missing or invalid 'method' field");
  }

  if (
    typeof canonical["headers"] !== "object" ||
    canonical["headers"] === null
  ) {
    return badRequest("Missing or invalid 'headers' field");
  }

  return {
    url: canonical["url"] as string,
    method: (canonical["method"] as string).toUpperCase(),
    headers: canonical["headers"] as Record<string, string>,
    body:
      typeof canonical["body"] === "string"
        ? (canonical["body"] as string)
        : null,
  };
}

/**
 * Fetch directly using UrlFetchApp (no external server).
 */
function fetchDirect(
  req: GasTransportRequest,
): GoogleAppsScript.Content.TextOutput {
  const fetchOptions: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: req.method.toLowerCase() as GoogleAppsScript.URL_Fetch.HttpMethod,
    headers: req.headers,
    muteHttpExceptions: true,
    followRedirects: false,
    validateHttpsCertificates: true,
  };

  if (req.body !== null && !["GET", "HEAD"].includes(req.method)) {
    fetchOptions.payload = req.body;
  }

  const response = UrlFetchApp.fetch(req.url, fetchOptions);

  const responseCode = response.getResponseCode();
  const responseHeaders = response.getAllHeaders() as Record<
    string,
    string | string[]
  >;
  const contentType =
    (responseHeaders["Content-Type"] as string) ??
    (responseHeaders["content-type"] as string) ??
    "application/octet-stream";

  // Flatten multi-value headers to comma-separated strings
  const flatHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(responseHeaders)) {
    flatHeaders[key] = Array.isArray(value) ? value.join(", ") : value;
  }

  let body: string;
  let encoding: "utf-8" | "base64";

  if (isTextContentType(contentType)) {
    body = response.getContentText();
    encoding = "utf-8";
  } else {
    body = Utilities.base64Encode(response.getContent());
    encoding = "base64";
  }

  return encodeResponse({
    status: responseCode,
    statusText: String(responseCode),
    headers: flatHeaders,
    body,
    encoding,
  });
}

/**
 * Encode a GasTransportResponse: map fields and base64-encode.
 */
function encodeResponse(
  gasResponse: GasTransportResponse,
): GoogleAppsScript.Content.TextOutput {
  const mapped = mapFields(
    gasResponse as unknown as Record<string, unknown>,
    __FIELD_MAP__ as unknown as FieldMap,
  );
  const plainJson = JSON.stringify(mapped);
  const encoded = Utilities.base64Encode(
    Utilities.newBlob(plainJson, "application/octet-stream").getBytes(),
  );

  // Return the base64 blob as plain text (opaque to intermediaries)
  return ContentService.createTextOutput(encoded).setMimeType(
    ContentService.MimeType.TEXT,
  );
}

/**
 * Handle a proxy request: decode -> forward via UrlFetchApp or external -> encode response.
 */
export function handleProxy(
  postBody: string,
): GoogleAppsScript.Content.TextOutput {
  const reqOrError = parseRequest(postBody);

  // If parseRequest returned a TextOutput, it's an error
  if ("getContent" in reqOrError) {
    return reqOrError as GoogleAppsScript.Content.TextOutput;
  }

  const req = reqOrError as GasTransportRequest;

  try {
    // If an external bare server is configured, always use it
    if (__EXTERNAL_BARE_URL__) {
      const gasResponse = fetchViaExternal(req);
      return encodeResponse(gasResponse);
    }

    // Otherwise, fetch directly
    return fetchDirect(req);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return internalError(`Proxy fetch failed: ${message}`);
  }
}
