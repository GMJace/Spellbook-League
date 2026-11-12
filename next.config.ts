import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  return {
    devIndicators: false,
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
    async redirects() {
      return [
        {
          source: "/dm-guide",
          destination: "/quests/dm-guide",
          permanent: true,
        },
      ];
    },
    experimental: {
      serverActions: {
        bodySizeLimit: "20mb",
      },
    },
  };
}
