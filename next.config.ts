import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // The TypeScript CLI subprocess exits without --showConfig output under Node 24.
    useTypeScriptCli: false,
  },
};

export default nextConfig;
