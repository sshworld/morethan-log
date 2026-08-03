import { GetServerSideProps } from "next"
import { getServerSideSitemap, ISitemapField } from "next-sitemap"
import { CONFIG } from "site.config"

import { getPosts } from "src/apis/notion-client/getPosts"

/**
 * /sitemap 과 /sitemap.xml 이 같은 내용을 서빙한다.
 * robots.txt 는 next-sitemap 이 /sitemap.xml 로 생성하니 그쪽이 정식 경로고,
 * /sitemap 은 손으로 치기 쉬운 별칭이다. 리다이렉트 대신 라우트를 두 개 둔다.
 */
export const sitemapProps: GetServerSideProps = async (ctx) => {
  // CDN 캐시. 없으면 크롤러 요청마다 getPosts() 가 Notion 을 전량 조회하다 500 이 난다.
  ctx.res.setHeader(
    "Cache-Control",
    `public, s-maxage=${CONFIG.revalidateTime}, stale-while-revalidate=59`
  )

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)

  // 허용 목록으로 거르면 status·type 값이 제각각인 정적 페이지(privacy-policy 등)가
  // 조용히 빠진다. 기존 동작을 유지하고 막아야 할 것만 뺀다 — 검토 전 초안과 예약 발행분.
  const posts = (await getPosts()).filter((post) => {
    if (!post.title || !post.slug) return false
    if (post.status?.[0] === "Private") return false
    return new Date(post.date?.start_date || post.createdTime) <= tomorrow
  })

  const lastmodOf = (post: (typeof posts)[number]) =>
    new Date(post.date?.start_date || post.createdTime).toISOString()

  const fields: ISitemapField[] = [
    {
      loc: CONFIG.link,
      lastmod: posts[0] ? lastmodOf(posts[0]) : new Date().toISOString(),
      priority: 1.0,
      changefreq: "daily",
    },
    ...posts.map((post) => ({
      loc: `${CONFIG.link}/${post.slug}`,
      lastmod: lastmodOf(post),
      priority: 0.7,
      changefreq: "weekly" as const,
    })),
  ]

  return getServerSideSitemap(ctx, fields)
}
