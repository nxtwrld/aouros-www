import { redirect } from '@sveltejs/kit'

export const GET = () => {
  console.log('[DevTools] Ignoring Chrome DevTools request')
  return redirect(302, '/')
}
