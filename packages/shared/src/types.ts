/**
 * Bare v4 types derived from the TOMPHTTP specifications-v4.
 *
 * These types describe the meta response, the custom gas-transport
 * request/response payloads, chunked-transport types, and shared
 * error structures.
 */

// ---------------------------------------------------------------------------
// Bare Meta (GET /)
// ---------------------------------------------------------------------------

export interface ReassignEndpoints {
  [key: string]: string;
}

export interface ReassignHeaders {
  [key: string]: string;
}

export interface Reassign {
  endpoints: ReassignEndpoints;
  headers: ReassignHeaders;
}

export interface SupportedSpecification {
  by: string;
  name: string;
  endpoint: string;
}

export interface LoadIndicators {
  memoryTotal: number;
  memoryFree: number;
  activeConns: number;
  latency: number;
}

export interface Maintainer {
  email: string;
  website: string;
}

export interface Project {
  name: string;
  description: string;
  email: string;
  website: string;
  repository: string;
  version: string;
}

/**
 * Configuration for the gas-transport field randomisation,
 * advertised in the bare meta so clients can decode proxy traffic.
 */
export interface GasTransportConfig {
  /** Map of canonical field names -> obfuscated field names. */
  fields: Record<string, string>;
}

export interface BareMeta {
  reassign: Reassign;
  supportedSpecifications: SupportedSpecification[];
  isSecured: boolean;
  loadIndicators: LoadIndicators;
  maintainer: Maintainer;
  project: Project;
  /**
   * gas-transport specific configuration (field mapping).
   * Only present on GAS bare servers that use the gas-transport spec.
   * Standard bare v4 servers will not include this field.
   */
  gasTransport?: GasTransportConfig;
}

// ---------------------------------------------------------------------------
// gas-transport custom specification
// ---------------------------------------------------------------------------

/**
 * The proxy request body sent via POST to the proxy endpoint.
 * All bare metadata is encoded here because GAS web apps cannot
 * read custom HTTP request headers.
 */
export interface GasTransportRequest {
  /** The remote URL to fetch. */
  url: string;
  /** HTTP method (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS). */
  method: string;
  /** Headers to forward to the remote server. */
  headers: Record<string, string>;
  /** Request body. `null` for bodiless methods (GET, HEAD). */
  body: string | null;
}

/**
 * The proxy response body returned as JSON TextOutput.
 */
export interface GasTransportResponse {
  /** HTTP status code from the remote server. */
  status: number;
  /** HTTP status text. */
  statusText: string;
  /** Response headers from the remote server. */
  headers: Record<string, string>;
  /**
   * Response body.
   * Plain text for text content, base64-encoded for binary.
   */
  body: string;
  /**
   * Encoding of the body field.
   * - `"utf-8"`: body is plain text
   * - `"base64"`: body is base64-encoded binary
   */
  encoding: "utf-8" | "base64";
}

// ---------------------------------------------------------------------------
// chunked-transport (GAS server <-> external bare server)
// ---------------------------------------------------------------------------

/**
 * Proxy request sent from the GAS server to the external bare server.
 * Extends the gas-transport request with a response size limit that
 * triggers chunked responses when the payload is too large.
 */
export interface ChunkedProxyRequest {
  /** The remote URL to fetch. */
  url: string;
  /** HTTP method. */
  method: string;
  /** Headers to forward to the remote server. */
  headers: Record<string, string>;
  /** Request body. `null` for bodiless methods. */
  body: string | null;
  /**
   * Maximum HTTP response body size (in bytes) the caller can accept.
   * If the proxied response exceeds this, the server splits it into
   * chunks. Omit or set to 0 for no limit.
   */
  maxResponseSize?: number;
}

/**
 * Metadata about a chunk in a chunked response.
 */
export interface ChunkInfo {
  /** Unique identifier for the chunked response set. */
  id: string;
  /** Zero-based index of this chunk. */
  index: number;
  /** Total number of chunks. */
  total: number;
}

/**
 * Proxy response from the external bare server.
 * If the response fits within `maxResponseSize`, no `chunk` field is
 * present. Otherwise `chunk` describes the first piece and the client
 * must fetch the remaining chunks.
 */
export interface ChunkedProxyResponse {
  /** HTTP status code from the remote server. */
  status: number;
  /** HTTP status text. */
  statusText: string;
  /** Response headers from the remote server. */
  headers: Record<string, string>;
  /**
   * Response body (or first chunk of it).
   * Always base64-encoded when chunked.
   */
  body: string;
  /** Encoding of the body field. */
  encoding: "utf-8" | "base64";
  /**
   * Present only when the response was split.
   * Describes this chunk and the total number of chunks.
   */
  chunk?: ChunkInfo;
}

/**
 * Response returned when fetching a subsequent chunk.
 */
export interface ChunkFetchResponse {
  /** Base64-encoded chunk body. */
  body: string;
  /** Chunk metadata. */
  chunk: ChunkInfo;
}

// ---------------------------------------------------------------------------
// Bare Error
// ---------------------------------------------------------------------------

export interface BareError {
  id: string;
  message: string;
  status: number;
}
