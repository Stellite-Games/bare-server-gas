import { randomBytes } from "node:crypto";
import { defineConfig } from "vite-plus";
import gasPlugin from "@gas-plugin/unplugin/vite";

function randomFieldName(): string {
	return `_${randomBytes(4).toString("hex")}`;
}

export default defineConfig({
	plugins: [gasPlugin()],
	define: {
		__FIELD_MAP__: JSON.stringify({
			url: randomFieldName(),
			method: randomFieldName(),
			headers: randomFieldName(),
			body: randomFieldName(),
			status: randomFieldName(),
			statusText: randomFieldName(),
			encoding: randomFieldName(),
		}),
		__EXTERNAL_BARE_URL__: JSON.stringify(
			process.env.VITE_EXTERNAL_BARE_URL || "",
		),
	},
	build: {
		lib: {
			entry: "src/main.ts",
			formats: ["es"],
			fileName: () => "Code.js",
		},
		outDir: "dist",
	},
});
