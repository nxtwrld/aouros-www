import { error, json, type RequestHandler } from "@sveltejs/kit";
import { finalize } from "$lib/session/finalizeReport";

export const POST: RequestHandler = async ({
  request,
  locals: { supabase, safeGetSession, user },
}) => {
  const { session } = await safeGetSession();

  if (!session || !user) {
    error(401, { message: "Unauthorized" });
  }

  const data = await request.json();
  if (data.text === undefined) {
    error(400, { message: "No  text provided" });
  }

  const result = await finalize(data);

  return json(result);
};
