import { defineStore } from 'pinia';
import { AuthError, type UserData } from '~/plugins/auth';

/**
 *
 * Токены и профиль (token, refresh, expiresAt, user в localStorage) ведёт $auth, стор их только отражает:
 * userData - для шапки и меню, isAuthenticated - для middleware.
 * Срок входа определяет refresh на сервере: просроченный access $auth обновит сам при запросе.
 */
export const useUserStore = defineStore('user', {
	state: () => ({
		token: useNuxtApp().$auth.token,
		userData: useNuxtApp().$auth.user as UserData | null,
	}),
	getters: {
		isAuthenticated: (state) => Boolean(state.token && state.userData),
		/**
		 * Есть ли у пользователя право key не ниже level (1 - чтение, 2 - запись, 3 - удаление), как PermissionsGuard на сервере.
		 * Только для показа пунктов и кнопок: проверяет всё равно сервер. Права из профиля входа - обновятся с ближайшим refresh.
		 */
		can: (state) => (key: string, level = 1) => {
			const permission = state.userData?.permissions[key];
			return (Array.isArray(permission) ? permission[0] : permission ?? 0) >= level;
		},
	},
	actions: {
		/** false - неверный логин/пароль; другие ошибки (сервер недоступен, приложение отключено) бросаются с текстом */
		async signIn(login: string, password: string) {
			try {
				await useNuxtApp().$auth.login(login.trim(), password);
			}
			catch(e) {
				if(e instanceof AuthError && e.status === 401) return false;
				throw e;
			}
			this.loadFromStorage();
			return true;
		},

		loadFromStorage() {
			const auth = useNuxtApp().$auth;
			this.token = auth.isAuthenticated ? auth.token : null;
			this.userData = auth.isAuthenticated ? auth.user : null;
		},

		reset() {
			useNuxtApp().$auth.logout();
			this.token = null;
			this.userData = null;
		}
	}
});
