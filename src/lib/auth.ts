import { getClient} from '$slib/supabase';

async function logout() {
    const supabase = getClient();
    const { data : { user } } = await supabase.auth.getUser()
    console.log(user);
    if (!user) {
        return;
    }
    return await supabase?.auth.signOut();
}


const auth = {
    logout : () => {
        return logout();
    }
}

export default auth;