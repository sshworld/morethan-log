import { GetServerSideProps } from "next"
import { CONFIG } from "site.config"

import { getPosts } from "../apis"
import { filterPosts } from "src/libs/utils/notion"

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const posts = filterPosts(await getPosts())

  const items = posts
    .map((post) => {
      const url = `${CONFIG.link}/${post.slug}`
      const pubDate = new Date(
        post.date?.start_date || post.createdTime
      ).toUTCString()
      const categories = (post.tags ?? [])
        .map((tag) => `<category>${escapeXml(tag)}</category>`)
        .join("")

      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(post.summary ?? "")}</description>
${categories ? `      ${categories}\n` : ""}    </item>`
    })
    .join("\n")

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(CONFIG.blog.title)}</title>
    <link>${CONFIG.link}</link>
    <description>${escapeXml(CONFIG.blog.description)}</description>
    <language>${CONFIG.lang}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${CONFIG.link}/rss" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`

  res.setHeader("Content-Type", "application/rss+xml; charset=utf-8")
  res.setHeader(
    "Cache-Control",
    `public, s-maxage=${CONFIG.revalidateTime}, stale-while-revalidate=59`
  )
  res.write(feed)
  res.end()

  return { props: {} }
}

// Default export to prevent next.js errors
export default () => null
