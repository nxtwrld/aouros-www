/** @type {import('./$types').PageServerLoad} */
export function load(event) {
	return {
		locals: event.locals
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	signup: async ({ request }) => {
		// store data to vercel postgres beta account requests table

        
		const data = await request.formData();
		const email = data.get('email');
		const role = data.get('role');
		console.log(email, role);

		
        return { message: 'success', success: true };



	}
};