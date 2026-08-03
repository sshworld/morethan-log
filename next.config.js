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
  // /feed 는 라우트가 없어서 [slug] 캐치올이 200 으로 받아왔다.
  // 색인에 남은 걸 정리하려면 404 보다 301 이 빠르다. 정식 경로는 /rss.
  async redirects() {
    return [{ source: '/feed', destination: '/rss', permanent: true }]
  },
}

module.exports = nextConfig
