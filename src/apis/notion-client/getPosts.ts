import { CONFIG } from "site.config"
import { NotionAPI } from "notion-client"
import { idToUuid } from "notion-utils"

import getAllPageIds from "src/libs/utils/notion/getAllPageIds"
import getPageProperties from "src/libs/utils/notion/getPageProperties"
import { TPosts } from "src/types"

/**
 * notion-client 는 재시도를 하지 않는다. Notion 이 502 를 한 번 뱉으면
 * getPage 가 collection 없는 응답을 돌려주고, 아래 Object.values 가
 * TypeError 로 터져 빌드 전체(getStaticPaths)와 sitemap 응답이 함께 죽는다.
 * 상류 오류는 대체로 일시적이라 짧게 물러났다 다시 시도한다.
 */
const RETRY_DELAYS_MS = [500, 1500, 4000]

const fetchPageWithRetry = async (api: NotionAPI, pageId: string) => {
  let lastError: unknown

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const response = await api.getPage(pageId)
      // 502 응답은 collection 이 비어서 돌아온다. 여기서 걸러 재시도 대상으로 만든다.
      if (!response?.collection) {
        throw new Error("Notion response has no collection")
      }
      return response
    } catch (error) {
      lastError = error
      const delay = RETRY_DELAYS_MS[attempt]
      if (delay === undefined) break
      console.warn(
        `getPosts: Notion 조회 실패 (${attempt + 1}/${
          RETRY_DELAYS_MS.length + 1
        }), ${delay}ms 후 재시도`,
        error
      )
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * @param {{ includePages: boolean }} - false: posts only / true: include pages
 */

// TODO: react query를 사용해서 처음 불러온 뒤로는 해당데이터만 사용하도록 수정
export const getPosts = async () => {
  let id = CONFIG.notionConfig.pageId as string
  const api = new NotionAPI()

  const response = await fetchPageWithRetry(api, id)
  id = idToUuid(id)
  const collectionValue = Object.values(response.collection)[0]?.value as any
  const collection = collectionValue?.value ?? collectionValue
  const block = response.block
  const schema = collection?.schema

  const blockValue = (block[id].value as any)?.value ?? block[id].value
  const rawMetadata = blockValue

  // Check Type
  if (
    rawMetadata?.type !== "collection_view_page" &&
    rawMetadata?.type !== "collection_view"
  ) {
    return []
  } else {
    // Construct Data
    const pageIds = getAllPageIds(response)
    const data = []
    for (let i = 0; i < pageIds.length; i++) {
      const id = pageIds[i]
      const properties = (await getPageProperties(id, block, schema)) || null
      // Add fullwidth, createdtime to properties
      const pageBlockValue = (block[id].value as any)?.value ?? block[id].value
      properties.createdTime = new Date(
        pageBlockValue?.created_time
      ).toString()
      properties.fullWidth =
        (pageBlockValue?.format as any)?.page_full_width ?? false

      data.push(properties)
    }

    // Sort by date
    data.sort((a: any, b: any) => {
      const dateA: any = new Date(a?.date?.start_date || a.createdTime)
      const dateB: any = new Date(b?.date?.start_date || b.createdTime)
      return dateB - dateA
    })

    const posts = data as TPosts
    return posts
  }
}
