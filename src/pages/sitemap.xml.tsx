import { getPosts } from "../apis/notion-client/getPosts"
import { filterPosts } from "src/libs/utils/notion"
import { CONFIG } from "site.config"
import { getServerSideSitemap, ISitemapField } from "next-sitemap"
import { GetServerSideProps } from "next"

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  // CDN 캐시. 없으면 크롤러 요청마다 getPosts() 가 Notion 을 전량 조회하다 500 이 난다.
  ctx.res.setHeader(
    "Cache-Control",
    `public, s-maxage=${CONFIG.revalidateTime}, stale-while-revalidate=59`
  )

  // Private 초안·미래 날짜·slug 없는 글 제외. Page 는 색인 대상이라 남긴다.
  const posts = filterPosts(await getPosts(), {
    acceptStatus: ["Public", "PublicOnDetail"],
    acceptType: ["Post", "Page"],
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

// Default export to prevent next.js errors
export default () => {}
