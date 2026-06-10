/** @type {import('next').NextConfig} */

const allowedOrigins = ['localhost:3000']

if (process.env.NEXTAUTH_URL) {
  try {
    const host = new URL(process.env.NEXTAUTH_URL).host
    if (host && !allowedOrigins.includes(host)) {
      allowedOrigins.push(host)
    }
  } catch {
    // NEXTAUTH_URL malformada — localhost sigue disponible
  }
}

const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins,
    },
  },
}

module.exports = nextConfig
