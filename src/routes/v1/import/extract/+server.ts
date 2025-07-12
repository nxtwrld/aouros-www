import { error, json, type RequestHandler } from "@sveltejs/kit";
import assess from "$lib/import.server/assessInputs";
import {
  loadSubscription,
  updateSubscription,
} from "$lib/user/subscriptions.server.js";

export const POST: RequestHandler = async ({
  request,
  locals: { supabase, safeGetSession, user },
}) => {
  //const str = url.searchParams.get('drug');

  const { session } = await safeGetSession();

  if (!session || !user) {
    error(401, { message: "Unauthorized" });
  }
  const subscription = await loadSubscription(user.id);
  //console.log('user', subscription);
  if (!subscription) {
    error(404, { message: "Subscription not found" });
  }

  if (subscription.scans == 0) {
    error(403, { message: "Subscription limit reached" });
  }

  const data = await request.json();

  if (data.images === undefined && data.text === undefined) {
    error(400, { message: "No image or text provided" });
  }

  const result = await assess(data);

  subscription.scans -= 1;
  const u = await updateSubscription(subscription, user.id);

  return json(result);
};
