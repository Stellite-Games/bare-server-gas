import { toNodeHandler } from "h3";
import { createBareServer } from "./server";
import type { BareServerOptions } from "./server";

export function bareServerPlugin(options: BareServerOptions = {}) {
  return {
    name: "bare-server-nitro",

    configureServer(server: {
      middlewares: { use: (handler: unknown) => void };
    }) {
      const app = createBareServer(options);
      const handler = toNodeHandler(app);
      server.middlewares.use(handler);
    },
  };
}
