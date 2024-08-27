import { redirect } from '@sveltejs/kit';
 
export function load() {
  redirect(302, '/www'); // needs `throw` in v1
}