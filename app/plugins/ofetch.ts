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

	const reportHandlerFetch = createApiClient(config.public.REPORT_HANDLER_API_BASE);
	const meterApiFetch = createApiClient(config.public.METER_APP_API_BASE);
	const facilityApiFetch = createApiClient(config.public.FACILITY_API_BASE);

	// Делаем доступным как $fetchReportHandler и $fetchMeterApp
	return { provide: { fetchReportHandler: reportHandlerFetch, fetchMeterApp: meterApiFetch, fetchFacility: facilityApiFetch } };
})
