import type { BareError } from "@bare-server-gas/shared";

export function createErrorResponse(
  id: string,
  message: string,
  status: number,
): GoogleAppsScript.Content.TextOutput {
  const error: BareError = { id, message, status };
  return ContentService.createTextOutput(JSON.stringify(error)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

export function badRequest(
  message: string,
): GoogleAppsScript.Content.TextOutput {
  return createErrorResponse("error.bad_request", message, 400);
}

export function internalError(
  message: string,
): GoogleAppsScript.Content.TextOutput {
  return createErrorResponse("error.internal", message, 500);
}
