import { error, json, type RequestHandler } from "@sveltejs/kit";
import { analyze } from "$lib/import.server/analyzeReport";

export const POST: RequestHandler = async ({ request }) => {
  //const str = url.searchParams.get('drug');

  const data = await request.json();
  if (data.images === undefined && data.text === undefined) {
    error(400, { message: "No image or text provided" });
  }

  const result = await analyze(data);

  return json(result);
};
