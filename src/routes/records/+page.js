import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch, params, url }) {
	try {
		const date = url.searchParams.get('date');
		let dateParams = date ? `?date=${date}` : '';
		const data = await fetch(`/api/records${dateParams}`);

		if (data && data.ok) {
			const recordsResponse = await data.json();

			return {
				records: recordsResponse.data
			};
		}
	} catch (e) {
		console.log(e);
		return {
			records: []
		};
	}
	// throw error(404, 'Not found');
}