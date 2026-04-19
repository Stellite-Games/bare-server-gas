import { badRequest } from "./errors";
import { handleMeta } from "./meta";
import { handleProxy } from "./proxy";

export function doGet(
	_e: GoogleAppsScript.Events.DoGet,
): GoogleAppsScript.Content.TextOutput {
	return handleMeta();
}

export function doPost(
	e: GoogleAppsScript.Events.DoPost,
): GoogleAppsScript.Content.TextOutput {
	const body = e.postData?.contents;
	if (!body) {
		return badRequest("Empty request body");
	}
	return handleProxy(body);
}
