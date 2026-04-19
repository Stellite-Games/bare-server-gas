import type { BareMeta, GasTransportConfig } from "@bare-server-gas/shared";

export type TransportMode = "gas" | "standard";

export interface ResolvedMeta {
	meta: BareMeta;
	mode: TransportMode;
	proxyUrl: string;
	gasConfig: GasTransportConfig | null;
	bareHeaders: ResolvedBareHeaders | null;
}

export interface ResolvedBareHeaders {
	url: string;
	headers: string;
	forwardHeaders: string;
	passHeaders: string;
	passStatus: string;
	status: string;
	statusText: string;
	responseHeaders: string;
}

const DEFAULT_BARE_HEADERS: ResolvedBareHeaders = {
	url: "x-bare-url",
	headers: "x-bare-headers",
	forwardHeaders: "x-bare-forward-headers",
	passHeaders: "x-bare-pass-headers",
	passStatus: "x-bare-pass-status",
	status: "x-bare-status",
	statusText: "x-bare-status-text",
	responseHeaders: "x-bare-headers",
};

export async function fetchMeta(serverUrl: string): Promise<BareMeta> {
	const response = await fetch(serverUrl, { method: "GET" });

	if (!response.ok) {
		throw new Error(
			`Failed to fetch bare meta from ${serverUrl}: HTTP ${response.status}`,
		);
	}

	return (await response.json()) as BareMeta;
}

export function detectMode(meta: BareMeta): TransportMode {
	if (
		meta.gasTransport?.fields &&
		Object.keys(meta.gasTransport.fields).length > 0
	) {
		return "gas";
	}
	return "standard";
}

export function resolveProxyUrl(
	serverUrl: string,
	meta: BareMeta,
	mode: TransportMode,
): string {
	if (mode === "gas") {
		return serverUrl;
	}
	const base = serverUrl.endsWith("/") ? serverUrl : `${serverUrl}/`;
	const proxySubpath = meta.reassign.endpoints["proxy"] ?? "proxy";
	return `${base}${proxySubpath}`;
}

export function resolveHeaders(meta: BareMeta): ResolvedBareHeaders {
	const reassign = meta.reassign.headers;
	return {
		url: reassign["x-bare-url"] ?? DEFAULT_BARE_HEADERS.url,
		headers: reassign["x-bare-headers"] ?? DEFAULT_BARE_HEADERS.headers,
		forwardHeaders:
			reassign["x-bare-forward-headers"] ?? DEFAULT_BARE_HEADERS.forwardHeaders,
		passHeaders:
			reassign["x-bare-pass-headers"] ?? DEFAULT_BARE_HEADERS.passHeaders,
		passStatus:
			reassign["x-bare-pass-status"] ?? DEFAULT_BARE_HEADERS.passStatus,
		status: reassign["x-bare-status"] ?? DEFAULT_BARE_HEADERS.status,
		statusText:
			reassign["x-bare-status-text"] ?? DEFAULT_BARE_HEADERS.statusText,
		responseHeaders:
			reassign["x-bare-headers"] ?? DEFAULT_BARE_HEADERS.responseHeaders,
	};
}

export async function resolveMeta(serverUrl: string): Promise<ResolvedMeta> {
	const meta = await fetchMeta(serverUrl);
	const mode = detectMode(meta);
	const proxyUrl = resolveProxyUrl(serverUrl, meta, mode);

	return {
		meta,
		mode,
		proxyUrl,
		gasConfig: mode === "gas" ? meta.gasTransport! : null,
		bareHeaders: mode === "standard" ? resolveHeaders(meta) : null,
	};
}
