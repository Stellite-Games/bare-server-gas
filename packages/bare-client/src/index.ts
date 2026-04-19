import type { BareMeta } from "@bare-server-gas/shared";
import type { ResolvedMeta, TransportMode } from "./meta";
import { resolveMeta } from "./meta";
import { decodeBase64, sendGasRequest, sendStandardRequest } from "./request";

export type { TransportMode, ResolvedMeta } from "./meta";
export type { ResolvedBareHeaders } from "./meta";

export interface BareClientOptions {
	serverUrl: string;
}

export interface BareRequestInit {
	method?: string;
	headers?: Record<string, string>;
	body?: string | null;
}

export interface BareResponse {
	ok: boolean;
	status: number;
	statusText: string;
	headers: Record<string, string>;
	body: string;
	rawBody: ArrayBuffer | null;
}

export class BareClient {
	private serverUrl: string;
	private resolved: ResolvedMeta | null = null;

	constructor(options: BareClientOptions) {
		this.serverUrl = options.serverUrl;
	}

	async connect(): Promise<BareMeta> {
		this.resolved = await resolveMeta(this.serverUrl);
		return this.resolved.meta;
	}

	async getMeta(): Promise<BareMeta> {
		if (!this.resolved) {
			await this.connect();
		}
		return this.resolved!.meta;
	}

	get mode(): TransportMode {
		if (!this.resolved) {
			throw new Error("BareClient: call connect() before accessing mode");
		}
		return this.resolved.mode;
	}

	async fetch(url: string, init: BareRequestInit = {}): Promise<BareResponse> {
		if (!this.resolved) {
			await this.connect();
		}
		const resolved = this.resolved!;
		const method = init.method ?? "GET";
		const headers = init.headers ?? {};
		const body = init.body ?? null;

		if (resolved.mode === "gas") {
			return this.fetchGas(resolved, url, method, headers, body);
		}
		return this.fetchStandard(resolved, url, method, headers, body);
	}

	private async fetchGas(
		resolved: ResolvedMeta,
		url: string,
		method: string,
		headers: Record<string, string>,
		body: string | null,
	): Promise<BareResponse> {
		const gasResponse = await sendGasRequest(
			resolved.proxyUrl,
			url,
			method,
			headers,
			body,
			resolved.gasConfig!,
		);

		let decodedBody: string;
		if (gasResponse.encoding === "base64") {
			decodedBody = decodeBase64(gasResponse.body);
		} else {
			decodedBody = gasResponse.body;
		}

		return {
			ok: gasResponse.status >= 200 && gasResponse.status < 300,
			status: gasResponse.status,
			statusText: gasResponse.statusText,
			headers: gasResponse.headers,
			body: decodedBody,
			rawBody: null,
		};
	}

	private async fetchStandard(
		resolved: ResolvedMeta,
		url: string,
		method: string,
		headers: Record<string, string>,
		body: string | null,
	): Promise<BareResponse> {
		const stdResponse = await sendStandardRequest(
			resolved.proxyUrl,
			url,
			method,
			headers,
			body,
			resolved.bareHeaders!,
		);

		const decodedBody = new TextDecoder().decode(stdResponse.body);

		return {
			ok: stdResponse.status >= 200 && stdResponse.status < 300,
			status: stdResponse.status,
			statusText: stdResponse.statusText,
			headers: stdResponse.headers,
			body: decodedBody,
			rawBody: stdResponse.body,
		};
	}
}
