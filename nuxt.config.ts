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
			apiURL: process.env.NUXT_PUBLIC_API_BASE ?? 'https://api.gazprom.kg/api',
			apiToken: process.env.NUXT_PUBLIC_API_TOKEN,
			authLogin: process.env.NUXT_PUBLIC_AUTH_LOGIN ?? 'admin',
			authPasswordHash: process.env.NUXT_PUBLIC_AUTH_PASSWORD_HASH ?? '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918'
		},
	},

	modules: ['@pinia/nuxt'],
})
