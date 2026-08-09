import type { NextConfig } from "next";

const scriptSource = process.env.NODE_ENV === "development" ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'";
const developmentConnections = process.env.NODE_ENV === "development" ? " ws: wss:" : "";
const vercelAuthenticationConnection = process.env.VERCEL === "1" ? " https://vercel.com" : "";
const connectSource = `'self'${developmentConnections}${vercelAuthenticationConnection}`;
const manifestSource = process.env.VERCEL === "1" ? "'self' https://vercel.com" : "'self'";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
  { key: "Content-Security-Policy", value: `default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: https:; script-src ${scriptSource}; style-src 'self' 'unsafe-inline'; connect-src ${connectSource}; manifest-src ${manifestSource}; worker-src 'self'` },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" }] },
      { source: "/admin-sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Content-Type", value: "application/javascript; charset=utf-8" }, { key: "Service-Worker-Allowed", value: "/admin/" }] },
      { source: "/admin/manifest.webmanifest", headers: [{ key: "Cache-Control", value: "no-cache, must-revalidate" }] },
    ];
  },
};

export default nextConfig;
