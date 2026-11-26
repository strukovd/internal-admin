// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	ssr: false,

	devServer: {
		host: '0.0.0.0',
		port: 3000,
	},

	compatibilityDate: '2025-07-15',
	devtools: { enabled: true },

	css: [
		'@mdi/font/css/materialdesignicons.min.css',
		'~/assets/styles/global.scss'
	],

	nitro: { // Для генерации статических файлов
		preset: 'github-pages',
	},

	// Заголовки
	app: {
		head: {
			title: 'Portal',
			meta: [
				{ charset: 'utf-8' },
				{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			],
			link: [
				{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }
			]
		},
		baseURL: process.env.BASE_URL ?? '/',
	},

	runtimeConfig: {
		public: {
			REPORT_HANDLER_API_BASE: process.env.NUXT_PUBLIC_REPORT_HANDLER_API_BASE ?? 'https://api.gazprom.kg/api',
			METER_APP_API_BASE: process.env.NUXT_PUBLIC_METER_APP_API_BASE ?? 'https://api.gazprom.kg/api',
			FACILITY_API_BASE: process.env.NUXT_PUBLIC_FACILITY_API_BASE ?? 'https://api.gazprom.kg/api',
			TRIPS_API_BASE: process.env.NUXT_PUBLIC_TRIPS_API_BASE ?? 'http://10.14.188.202:7001/api/v1',
			// auth-handler: вход и раздел «Доступ» (plugins/auth-handler.ts)
			AUTH_HANDLER_API_BASE: process.env.NUXT_PUBLIC_AUTH_HANDLER_API_BASE ?? 'http://localhost:5555/api/v1',
			AUTH_HANDLER_APP: process.env.NUXT_PUBLIC_AUTH_HANDLER_APP ?? 'INTERNAL_ADMIN',
			apiToken: process.env.NUXT_PUBLIC_API_TOKEN,
		},
	},

	modules: ['@pinia/nuxt'],
})
