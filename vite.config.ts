import { defineConfig as originalDefineConfig } from "@lovable.dev/vite-tanstack-config";

const configFn = originalDefineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
});

export default async (env: any) => {
  const config = await (typeof configFn === "function" ? configFn(env) : configFn);
  if (!config.server) {
    config.server = {};
  }
  config.server.port = 3000;
  config.server.host = "0.0.0.0";
  if (config.server.strictPort) {
    config.server.strictPort = false;
  }
  return config;
};
