import type { PageLoad } from "./$types.d";
import store from "$lib/apps/store";

export const prerender = false;

export const load = (async ({ params }) => {
  console.log("params", params);
  const item = store.get(params.appId);

  if (!item) {
    return {
      status: 404,
      error: new Error(`No App ${params.appId} not found`),
    };
  }
  console.log("item", item);
  return {
    app: item,
  };
}) satisfies PageLoad;
