import type { LayoutServerLoad } from './$types'
import { log } from '$lib/logging/logger'

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
    log.api.error(`[LAYOUT ERROR] Layout server load failed for ${url.pathname}:`, error)
    throw error
  }
}