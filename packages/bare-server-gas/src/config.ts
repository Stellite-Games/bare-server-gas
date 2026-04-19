/**
 * @fileoverview Edit these config options to customize your deployment
 */

import type {
  BareMeta,
  GasTransportConfig,
  Reassign,
} from "@bare-server-gas/shared";

export const SERVER_VERSION = "0.1.0";

export const reassign: Reassign = {
  endpoints: {},
  headers: {},
};

export function resolveHeaderKey(original: string): string {
  return reassign.headers[original] ?? original;
}

export function buildMeta(): BareMeta {
  const gasTransport: GasTransportConfig = {
    fields: __FIELD_MAP__,
  };

  return {
    reassign,
    supportedSpecifications: [
      {
        by: "bare-server-gas",
        name: "gas-transport",
        endpoint: "",
      },
    ],
    isSecured: false,
    loadIndicators: {
      memoryTotal: 0,
      memoryFree: 0,
      activeConns: 0,
      latency: 0,
    },
    maintainer: {
      email: "inbox@ryanwilson.space",
      website: "https://ryanwilson.space",
    },
    project: {
      name: "bare-server-gas",
      description: "TOMPHTTP Bare v4 server running on Google Apps Script",
      website: "https://stellite.games",
      repository: "https://github.com/Stellite-Games/bare-server-gas",
      version: SERVER_VERSION,
    },
    gasTransport,
  };
}
