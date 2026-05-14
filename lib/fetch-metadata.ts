export interface LinkMetadata {
  title: string | null
  description: string | null
  image_url: string | null
  domain: string
}

export async function fetchUrlMetadata(url: string): Promise<LinkMetadata> {
  const domain = extractDomain(url)
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkSaver/1.0)',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return { title: null, description: null, image_url: null, domain }
    }

    const html = await response.text()
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)
    const title = ogTitleMatch?.[1] || titleMatch?.[1] || null

    // Extract description
    const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
                       html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i)
    const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)
    const description = ogDescMatch?.[1] || metaDescMatch?.[1] || null

    // Extract image
    const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
    let image_url = ogImageMatch?.[1] || null
    
    // Make relative URLs absolute
    if (image_url && !image_url.startsWith('http')) {
      try {
        const baseUrl = new URL(url)
        image_url = new URL(image_url, baseUrl.origin).href
      } catch {
        image_url = null
      }
    }

    return {
      title: title?.trim() || null,
      description: description?.trim() || null,
      image_url,
      domain,
    }
  } catch {
    return { title: null, description: null, image_url: null, domain }
  }
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}
