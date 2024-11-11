
import { error, json } from '@sveltejs/kit';
import assess from '$slib/import.server/assessInputs';
import { loadSubscription, updateSubscription } from '$slib/user/subscriptions.server.js';

/** @type {import('./$types.d').RequestHandler} */
export async function POST({ request, locals: { supabase, safeGetSession }}) {
	//const str = url.searchParams.get('drug');

    const { session } = await safeGetSession()

    if (!session) {
      return error(401, { message: 'Unauthorized' });
    }
    const subscription = await loadSubscription();
    console.log('user', subscription);
    if (!subscription) {
        error(404, { message: 'Subscription not found' });
    }

    if (subscription.scans == 0) {
        error(403, { message: 'Subscription limit reached' });
    }

    const data = await request.json();
    
    if (data.images === undefined && data.text === undefined) {
        error(400, { message: 'No image or text provided' });
    }

    const result = await assess(data);
    
    subscription.scans -= 1;
    const u = await updateSubscription(subscription);

    return json(result);
}

