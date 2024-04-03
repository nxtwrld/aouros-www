/** @type {import('./$types.d').Actions} */
export const actions = {
	default: async ({ request }) => {

		const data = await request.formData();
        const password = data.get('password');


        // check password against the hashed password on the share
        // if it matches, issue an auth token
        // if it doesn't, return an error
        

        console.log('🫀','Authenticate share', password);

        return {
            success: true
        }
	}
};