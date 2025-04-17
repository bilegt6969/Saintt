import { NextResponse } from 'next/server'

// Helper function to fetch with timeout and retries
const fetchWithRetry = async (url, options = {}, retries = 3, timeout = 10000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, { ...options, signal: controller.signal })
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      if (i === retries - 1) throw error // Throw error if all retries fail
      console.warn(`Attempt ${i + 1} failed. Retrying...`, error)
      await new Promise((resolve) => setTimeout(resolve, 2000)) // Wait 2 seconds before retrying
    }
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')

  if (!slug) {
    return NextResponse.json({ error: 'Slug parameter is required' }, { status: 400 })
  }

  const url = `  https://www.goat.com/_next/data/L7MghnP8330qgLJfmzpDP/en-us/apparel/${slug}.json?productTemplateSlug=${slug}  `
  console.log('HOOOOOOOYYYYY: ' + url)

  try {
    // Fetch main product data
    const data = await fetchWithRetry(url, {}, 3, 15000)
    const productId = data.pageProps.productTemplate.id

    // Fetch price data (with fallback)
    let PriceData = null
    try {
      const PriceTagUrl = `https://www.goat.com/web-api/v1/product_variants/buy_bar_data?productTemplateId=${productId}&countryCode=MN`
      console.log(PriceTagUrl)
      PriceData = await fetchWithRetry(PriceTagUrl, {}, 3, 15000)
    } catch (priceError) {
      console.error('Failed to fetch price data:', priceError)
      PriceData = { error: 'Failed to fetch price data' }
    }

    // Fetch recommended products (with fallback)
    let recommendedProducts = []
    try {
      const recommendedUrl = `https://www.goat.com/web-api/v1/product_templates/recommended?productTemplateId=${productId}&count=8`
      const recommendedResponse = await fetchWithRetry(recommendedUrl, {}, 3, 15000)
      recommendedProducts = recommendedResponse.productTemplates || [] // Ensure it's an array
    } catch (recommendedError) {
      console.error('Failed to fetch recommended products:', recommendedError)
      recommendedProducts = { error: 'Failed to fetch recommended products' }
    }

    // Return response with data and fallbacks
    return NextResponse.json({ data, PriceData, recommendedProducts })
  } catch (err) {
    console.error('Failed to fetch data:', err)
    return NextResponse.json({ error: `Failed to fetch data: ${err.message}` }, { status: 500 })
  }
}
