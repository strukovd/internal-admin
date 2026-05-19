import { defineNuxtPlugin } from '#app';

export default defineNuxtPlugin(() => {
	const config = useRuntimeConfig();

	const createApiClient = (baseURL: string) => $fetch.create({
		baseURL,
		onRequest({ options }) {
			if(config.public.apiToken) options.headers.set('api-token', config.public.apiToken);

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

	const apiFetch = createApiClient(config.public.apiURL);
	const meterApiFetch = createApiClient(config.public.meterAppApiURL);

	// Делаем доступным как $api и $meterApi
	return { provide: { api: apiFetch, meterApi: meterApiFetch } };
})
