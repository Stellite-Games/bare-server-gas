import { buildMeta } from "./config";

export function handleMeta(): GoogleAppsScript.Content.TextOutput {
  const meta = buildMeta();
  return ContentService.createTextOutput(JSON.stringify(meta)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
