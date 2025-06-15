import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ locals: { safeGetSession }, cookies, url }) => {
  try {
    const { session, user } = await safeGetSession()
    const allCookies = cookies.getAll()
    
    return {
      session,
      user,
      cookies: allCookies,
    }
  } catch (error) {
    console.error(`[LAYOUT ERROR] ❌ Layout server load failed for ${url.pathname}:`, error)
    throw error
  }
}