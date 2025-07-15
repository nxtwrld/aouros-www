import { error, json, type RequestHandler } from "@sveltejs/kit";
import { analyze } from "$lib/session/analyzeConversation";

export const POST: RequestHandler = async ({
  request,
  locals: { supabase, safeGetSession, user },
}) => {
  //const str = url.searchParams.get('drug');

  const { session } = await safeGetSession();

  if (!session || !user) {
    error(401, { message: "Unauthorized" });
  }

  const data = await request.json();
  if (data.text === undefined) {
    error(400, { message: "No  text provided" });
  }

  const result = await analyze(data);

  return json(result);
};
