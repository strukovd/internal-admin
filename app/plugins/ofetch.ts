import { defineNuxtPlugin } from '#app';

export default defineNuxtPlugin((nuxtApp) => {
	const config = useRuntimeConfig();

	const apiFetch = $fetch.create({
		baseURL: config.public.apiURL,
		onRequest({ options }) {
			options.headers.set('api-token', config.public.apiToken);

			if(import.meta.server) return;
			else {
				const token = localStorage.token;
				if (token) {
					options.headers.set('Authorization', `Bearer ${token}`);
				}
			}
		},
		onResponse({ response }) {
			// централизованная обработка
		},
		onResponseError({ response }) {
			// логика на 401/403/500 и т.п.
			switch (response.status) {
				case 401:
				case 403:
					useUserStore().reset();
					navigateTo('/login');
					break;
			}
		},
	});

	// Делаем доступным как $api
	return { provide: { api: apiFetch } };
})
