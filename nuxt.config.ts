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
})
