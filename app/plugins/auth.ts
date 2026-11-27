import { FetchError, ofetch } from 'ofetch';
import type { FetchOptions } from 'ofetch';
/** Право в токене: уровень (1 - чтение, 2 - запись, 3 - удаление) или [уровень, ...модификаторы] */
export type Permission = number | [number, ...string[]];
export type UserData = {
	id: number;
	username: string;
	name: string;
	position: string | null;
	parentId: number | null;
	avatar: string | null;
	defaultLang: string;
	permissions: Record<string, Permission>;
};
export type ResponseDTO<T> = { success: true; content: T };
export type PageableResponseDTO<T> = ResponseDTO<T[]> & { pagination: { page: number; size: number; totalElements: number; totalPages: number } };
type TokenDTO = { userData: UserData; accessToken: string; refreshToken: string; expiresIn: number };
export class AuthError extends Error {
	constructor(readonly status: number, message: string) {
		super(message);
	}
}
export type InstanceOptions = {
	/** URL к сервису авторизации */
	baseURL: string;
	/** Ключ приложения (для аудита) */
	app: string;
	/** Действия, когда продлить сессию (через refresh) не получилось */
	onKick?: () => void;
};

/*
 * Плагин работает с сервисом auth-handler. Реализует вход, хранение токенов, их обновление, запросы с токеном.
 * Не зависит от Nuxt/pinia - переносится в другой фронт копированием файла (нужен только ofetch).
 *
 * localStorage (приложения живут на своих поддоменах, поэтому ключи без префикса):
 *   token     - access JWT, уходит в Authorization
 *   refresh   - refresh JWT, только для /security/refresh
 *   expiresAt - когда истекает access (мс, как Date.now())
 *   user      - профиль и права из ответа входа (JSON)
 *
 * Запрос:
 *   - access истекает в ближайшие 30 сек - обновляем заранее, чтобы не ловить лишний 401;
 *   - на 401 - одно обновление и повтор запроса;
 *   - обновление не прошло (refresh истёк/отозван) - токены удаляются, вызывается onSessionEnd (обычно переход на вход);
 *   - параллельные запросы ждут одно общее обновление, а не шлют refresh каждый;
 *   - 403 - не выход: прав не хватает, ошибку показывает вызывающий.
 *
 * Пример:
 *   const auth = createAuthInstance({ baseURL: 'http://auth-handler:5555/api/v1', app: 'INTERNAL_ADMIN', onSessionEnd: () => router.push('/login') });
 *   await auth.login('ivanov', 'secret');
 *   const page = await auth.fetch<ApiPage<User>>('/users', { query: { find: 'ив' } });
 */

function createAuthInstance(options: InstanceOptions) {
	const fetcher = ofetch.create({ baseURL: options.baseURL });
	let refreshing: Promise<void> | null = null;

	function saveTokens(result: TokenDTO) {
		localStorage.setItem('token', result.accessToken);
		localStorage.setItem('refresh', result.refreshToken);
		localStorage.setItem('expiresAt', String(Date.now() + result.expiresIn * 1000));
		localStorage.setItem('user', JSON.stringify(result.userData));
	}

	/** Выход. (Чистка localStorage) */
	function logout() {
		for(const key of ['token', 'refresh', 'expiresAt', 'user']) localStorage.removeItem(key);
	}

	/**
	 * Метод описывает поведение, когда продлить access-токен не удалось
	 * Обычно редиректит на /login
	 */
	function kick() {
		logout();
		options.onKick?.();
	}

	/** Внутренняя обёртка над ofetch. Приводит ошибки к кастомному AuthError с текстом из ответа */
	async function _fetch<T>(url: string, init: FetchOptions<'json'>): Promise<T> {
		try {
			return await fetcher<T>(url, init);
		}
		catch(e) {
			if(!(e instanceof FetchError)) throw e;
			const status = e.status ?? 0;
			const message = e.data?.message ?? (status ? `Ошибка запроса (${status})` : 'Сервер авторизации недоступен');
			throw new AuthError(status, message);
		}
	}

	/** Стучит на сервер с попыткой авторизоватся. Примерно, отправляет $fetch('/login') */
	async function login(username: string, password: string): Promise<UserData> {
		const body = await _fetch<ResponseDTO<TokenDTO>>('/security/login', { method: 'POST', body: { username, password, app: options.app } });
		saveTokens(body.content);
		return body.content.userData;
	}

	/** Стучит на сервер, и пытается обновить токен */
	function refresh(): Promise<void> {
		refreshing ??= (async () => {
			try {
				const refreshToken = localStorage.getItem('refresh');
				if(!refreshToken) throw new AuthError(401, 'Требуется авторизация');
				const body = await _fetch<ResponseDTO<TokenDTO>>('/security/refresh', { method: 'POST', body: { refreshToken } });
				saveTokens(body.content);
			}
			catch(e) {
				// Выкидывает только при отказе сервера (4xx);
				// сеть или 500 - не повод выкидывать пользователя
				if(e instanceof AuthError && e.status >= 400 && e.status < 500) kick();
				throw e;
			}
			finally {
				refreshing = null;
			}
		})();
		return refreshing;
	}

	/** Запрос к API с access-токеном; возвращает тело ответа ({ success, content, pagination? }) */
	async function fetch<T>(url: string, init: FetchOptions<'json'> = {}): Promise<T> {
		if(!localStorage.getItem('refresh')) {
			kick();
			throw new AuthError(401, 'Требуется авторизация');
		}
		if(Number(localStorage.getItem('expiresAt')) - Date.now() < 30_000) await refresh();

		const withToken = () => ({ ...init, headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${localStorage.getItem('token')}` } });
		try {
			return await _fetch<T>(url, withToken());
		}
		catch(e) {
			if(!(e instanceof AuthError) || e.status !== 401) throw e;
			await refresh();
			return _fetch<T>(url, withToken());
		}
	}

	return {
		login,
		logout,
		fetch,
		/** Access JWT (может быть просрочен - fetch() обновит его сам) */
		get token() {
			return localStorage.getItem('token');
		},
		/** Профиль и права из последнего ответа входа/обновления */
		get user(): UserData | null {
			try {
				return JSON.parse(localStorage.getItem('user') ?? 'null');
			}
			catch {
				return null;
			}
		},
		/** Вошёл ли пользователь: есть refresh, которым можно продлить access */
		get isAuthenticated() {
			return Boolean(localStorage.getItem('refresh'));
		},
	};
}

/** $auth - клиент auth-handler: вход, токены, запросы к /users, /groups, /permissions */
export default defineNuxtPlugin(() => {
	const config = useRuntimeConfig();

	const auth = createAuthInstance({
		baseURL: String(config.public.AUTH_HANDLER_API_BASE),
		app: String(config.public.AUTH_HANDLER_APP),
		onKick: () => { // действия, когда сессия протухла, и даже refresh не помог
			useUserStore().reset();
			navigateTo('/login');
		},
	});

	return {
		provide: { auth },
	};
});

// export type AuthClient = ReturnType<typeof createAuthInstance>;
