import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  return {
    devIndicators: false,
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
    poweredByHeader: false,
    async headers() {
      return [
        {
          source: "/:path*",
          headers: [
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "X-Frame-Options", value: "DENY" },
            { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
            {
              key: "Permissions-Policy",
              value: "camera=(), microphone=(), geolocation=(), payment=(self \"https://www.paypal.com\")",
            },
            ...(process.env.NODE_ENV === "production"
              ? [
                  {
                    key: "Strict-Transport-Security",
                    value: "max-age=31536000; includeSubDomains",
                  },
                ]
              : []),
          ],
        },
      ];
    },
    experimental: {
      serverActions: {
        bodySizeLimit: "4mb",
      },
    },
  };
}
