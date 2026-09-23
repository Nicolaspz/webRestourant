import type { NextConfig } from "next";

// Permit WebSockets only for the configured API, not for arbitrary hosts.
const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BASE_API_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:3333' : 'https://server-restourant.onrender.com');
const apiOrigin = new URL(apiUrl).origin;
const socketOrigin = apiOrigin.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');

const nextConfig: NextConfig = {
  env: {
    BASE_API_URL: process.env.BASE_API_URL,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Robots-Tag",
            value: "index, follow",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https: ${apiOrigin} ${socketOrigin};`,
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiOrigin}/:path*`
      }
    ];
  }
};


export default nextConfig;
