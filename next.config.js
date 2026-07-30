/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.notion.so',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com', // accept all subdomains of googleusercontent.com
      },
      {
        protocol: 'https',
        hostname: 's3-us-west-2.amazonaws.com',
      },
    ],
  },
  // /rss is the canonical RSS path (advertised by <link rel="alternate">).
  // These are the other paths people type by hand.
  async redirects() {
    return ['/feed', '/rss.xml', '/feed.xml'].map((source) => ({
      source,
      destination: '/rss',
      permanent: true,
    }))
  },
}

module.exports = nextConfig
