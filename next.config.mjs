/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The OpenAI SDK and Drizzle run on the Node runtime, not Edge.
  serverExternalPackages: ["postgres"],
  experimental: {
    // next-intl and server actions benefit from typed routes once stable.
  },
  async headers() {
    // Baseline security headers (NFR-3xx). CSP is intentionally conservative;
    // tighten per-route once the third-party origins (OpenAI, Azure) are wired.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "microphone=(self), camera=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
