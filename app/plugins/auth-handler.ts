import { createAuthHandlerClient } from '~/lib/auth-handler-client';

/**
 * $authHandler - клиент auth-handler (вход, токены, запросы к /users, /groups, /permissions).
 * Пока адрес не задан (NUXT_PUBLIC_AUTH_HANDLER_API_BASE) - null: работает старый вход по admin:admin,
 * раздел «Доступ» скрыт. Так сборка без этой переменной ведёт себя как раньше.
 */
export default defineNuxtPlugin(() => {
	const config = useRuntimeConfig();
	const baseURL = String(config.public.AUTH_HANDLER_API_BASE || '');

	const authHandler = baseURL
		? createAuthHandlerClient({
			baseURL,
			app: String(config.public.AUTH_HANDLER_APP || 'ADMIN'),
			onSessionEnd: () => {
				useUserStore().reset();
				navigateTo('/login');
			},
		})
		: null;

	return {
		provide: { authHandler },
	};
});
