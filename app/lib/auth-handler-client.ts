import { FetchError, ofetch } from 'ofetch';
import type { FetchOptions } from 'ofetch';

/*
 * Клиент auth-handler для фронтов: вход, хранение сессии, обновление токенов, запросы с токеном.
 * Не зависит от Nuxt/pinia - переносится в другой фронт копированием файла (нужен только ofetch).
 *
 * Сессия (access + refresh) хранится в localStorage.
 * Запрос:
 *   - access истекает в ближайшие 30 сек - обновляем заранее, чтобы не ловить лишний 401;
 *   - на 401 - одно обновление и повтор запроса;
 *   - обновление не прошло (refresh истёк/отозван) - сессия сбрасывается, вызывается onSessionEnd (обычно переход на вход);
 *   - параллельные запросы ждут одно общее обновление, а не шлют refresh каждый;
 *   - 403 - не выход: прав не хватает, ошибку показывает вызывающий.
 *
 * Пример:
 *   const auth = createAuthHandlerClient({ baseURL: 'http://auth-handler:5555/api/v1', app: 'ADMIN', onSessionEnd: () => router.push('/login') });
 *   await auth.login('ivanov', 'secret');
 *   const page = await auth.request<ApiPage<User>>('/users', { query: { find: 'ив' } });
 */

/** Право в токене: уровень (1 - чтение, 2 - запись, 3 - удаление) или [уровень, ...модификаторы] */
export type AuthPermission = number | [number, ...string[]];

export type AuthUserData = {
	id: number;
	username: string;
	name: string;
	position: string | null;
	parentId: number | null;
	avatar: string | null;
	defaultLang: string;
	permissions: Record<string, AuthPermission>;
};

export type AuthSession = {
	accessToken: string;
	refreshToken: string;
	/** Когда истекает access (мс, Date.now()) */
	accessExpiresAt: number;
	userData: AuthUserData;
};

/** Тело ответа auth-handler */
export type ApiBody<T> = { success: true; content: T };
export type ApiPage<T> = ApiBody<T[]> & { pagination: { page: number; size: number; totalElements: number; totalPages: number } };

type AuthResult = { userData: AuthUserData; accessToken: string; refreshToken: string; expiresIn: number };

/** Ошибка запроса: status из ответа (0 - сервер недоступен), message - текст для пользователя */
export class AuthHandlerError extends Error {
	constructor(readonly status: number, message: string) {
		super(message);
	}
}

export type AuthHandlerClientOptions = {
	/** Адрес REST auth-handler вместе с префиксом, напр. http://localhost:5555/api/v1 */
	baseURL: string;
	/** Код приложения из auth.apps (для аудита входа), напр. ADMIN */
	app: string;
	/** Ключ в localStorage, если на одном домене несколько фронтов */
	storageKey?: string;
	/** Сессию больше не продлить - пора на страницу входа */
	onSessionEnd?: () => void;
};

export function createAuthHandlerClient(options: AuthHandlerClientOptions) {
	const storageKey = options.storageKey ?? 'auth_handler_session';
	const fetcher = ofetch.create({ baseURL: options.baseURL });
	let session = readSession();
	let refreshing: Promise<void> | null = null;

	function readSession(): AuthSession | null {
		try {
			return JSON.parse(localStorage.getItem(storageKey) ?? 'null');
		}
		catch {
			return null;
		}
	}

	function saveSession(result: AuthResult) {
		session = {
			accessToken: result.accessToken,
			refreshToken: result.refreshToken,
			accessExpiresAt: Date.now() + result.expiresIn * 1000,
			userData: result.userData,
		};
		localStorage.setItem(storageKey, JSON.stringify(session));
	}

	function logout() {
		session = null;
		localStorage.removeItem(storageKey);
	}

	function endSession() {
		logout();
		options.onSessionEnd?.();
	}

	/** Запрос без токена; ошибки ofetch приводятся к AuthHandlerError с текстом из ответа */
	async function send<T>(url: string, init: FetchOptions<'json'>): Promise<T> {
		try {
			return await fetcher<T>(url, init);
		}
		catch(e) {
			if(!(e instanceof FetchError)) throw e;
			const status = e.status ?? 0;
			const message = e.data?.message ?? (status ? `Ошибка запроса (${status})` : 'Сервер авторизации недоступен');
			throw new AuthHandlerError(status, message);
		}
	}

	async function login(username: string, password: string): Promise<AuthUserData> {
		const body = await send<ApiBody<AuthResult>>('/security/login', { method: 'POST', body: { username, password, app: options.app } });
		saveSession(body.content);
		return body.content.userData;
	}

	function refresh(): Promise<void> {
		refreshing ??= (async () => {
			try {
				if(!session) throw new AuthHandlerError(401, 'Требуется авторизация');
				const body = await send<ApiBody<AuthResult>>('/security/refresh', { method: 'POST', body: { refreshToken: session.refreshToken } });
				saveSession(body.content);
			}
			catch(e) {
				// Сессию завершает только отказ сервера (4xx); сеть или 500 - не повод выкидывать пользователя
				if(e instanceof AuthHandlerError && e.status >= 400 && e.status < 500) endSession();
				throw e;
			}
			finally {
				refreshing = null;
			}
		})();
		return refreshing;
	}

	/** Запрос к API с access-токеном; возвращает тело ответа ({ success, content, pagination? }) */
	async function request<T>(url: string, init: FetchOptions<'json'> = {}): Promise<T> {
		if(!session) {
			endSession();
			throw new AuthHandlerError(401, 'Требуется авторизация');
		}
		if(session.accessExpiresAt - Date.now() < 30_000) await refresh();

		const withToken = () => ({ ...init, headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${session!.accessToken}` } });
		try {
			return await send<T>(url, withToken());
		}
		catch(e) {
			if(!(e instanceof AuthHandlerError) || e.status !== 401) throw e;
			await refresh();
			return send<T>(url, withToken());
		}
	}

	return {
		login,
		logout,
		request,
		/** Профиль и права из последнего ответа входа/обновления */
		get userData() {
			return session?.userData ?? null;
		},
		get isAuthenticated() {
			return Boolean(session);
		},
	};
}

export type AuthHandlerClient = ReturnType<typeof createAuthHandlerClient>;
