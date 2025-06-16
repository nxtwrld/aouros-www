import { getClient} from '$lib/supabase';

async function logout() {
    const supabase = getClient();
    // No need to check if user exists - just sign out
    return await supabase?.auth.signOut();
}


const auth = {
    logout : () => {
        return logout();
    }
}

export default auth;