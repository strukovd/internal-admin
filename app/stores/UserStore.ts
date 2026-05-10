import { defineStore } from 'pinia';

type StoredUser = {
	login: string;
	name: string;
	role: string;
};

type StoredSession = {
	token: string;
	userData: StoredUser;
	expiresAt: number;
};

const AUTH_SESSION_KEY = 'auth_session';
const TOKEN_KEY = 'token';
const USER_KEY = 'user';

async function sha256(value: string) {
	const webCrypto = globalThis.crypto;
	if(!webCrypto?.subtle) return sha256Fallback(value);

	const buffer = await webCrypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
	return [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function createToken() {
	const bytes = new Uint8Array(24);
	const webCrypto = globalThis.crypto;
	if(webCrypto?.getRandomValues) {
		webCrypto.getRandomValues(bytes);
		return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
	}

	for(let i = 0; i < bytes.length; i++) {
		bytes[i] = Math.floor(Math.random() * 256);
	}

	return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function sha256Fallback(value: string) {
	const rotateRight = (value: number, bits: number) => (value >>> bits) | (value << (32 - bits));
	const bytes = Array.from(new TextEncoder().encode(value));
	const bitLength = bytes.length * 8;
	const hash = [
		0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
		0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
	];
	const constants = [
		0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
		0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
		0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
		0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
		0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
		0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
		0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
		0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
	];

	bytes.push(0x80);
	while((bytes.length % 64) !== 56) bytes.push(0);

	for(let i = 7; i >= 0; i--) {
		bytes.push((bitLength / Math.pow(256, i)) & 0xff);
	}

	for(let chunkStart = 0; chunkStart < bytes.length; chunkStart += 64) {
		const words = new Array<number>(64).fill(0);
		for(let i = 0; i < 16; i++) {
			const offset = chunkStart + i * 4;
			words[i] = (
				(bytes[offset] << 24)
				| (bytes[offset + 1] << 16)
				| (bytes[offset + 2] << 8)
				| bytes[offset + 3]
			) >>> 0;
		}

		for(let i = 16; i < 64; i++) {
			const s0 = rotateRight(words[i - 15], 7) ^ rotateRight(words[i - 15], 18) ^ (words[i - 15] >>> 3);
			const s1 = rotateRight(words[i - 2], 17) ^ rotateRight(words[i - 2], 19) ^ (words[i - 2] >>> 10);
			words[i] = (words[i - 16] + s0 + words[i - 7] + s1) >>> 0;
		}

		let [a, b, c, d, e, f, g, h] = hash;

		for(let i = 0; i < 64; i++) {
			const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
			const choice = (e & f) ^ (~e & g);
			const temp1 = (h + s1 + choice + constants[i] + words[i]) >>> 0;
			const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
			const majority = (a & b) ^ (a & c) ^ (b & c);
			const temp2 = (s0 + majority) >>> 0;

			h = g;
			g = f;
			f = e;
			e = (d + temp1) >>> 0;
			d = c;
			c = b;
			b = a;
			a = (temp1 + temp2) >>> 0;
		}

		hash[0] = (hash[0] + a) >>> 0;
		hash[1] = (hash[1] + b) >>> 0;
		hash[2] = (hash[2] + c) >>> 0;
		hash[3] = (hash[3] + d) >>> 0;
		hash[4] = (hash[4] + e) >>> 0;
		hash[5] = (hash[5] + f) >>> 0;
		hash[6] = (hash[6] + g) >>> 0;
		hash[7] = (hash[7] + h) >>> 0;
	}

	return hash.map(word => word.toString(16).padStart(8, '0')).join('');
}

function readStoredSession(): StoredSession | null {
	if(!import.meta.browser) return null;

	const rawSession = localStorage.getItem(AUTH_SESSION_KEY);
	if(rawSession) {
		try {
			const session = JSON.parse(rawSession) as StoredSession;
			if(session?.token && session?.expiresAt > Date.now()) return session;
		}
		catch {}
	}

	const legacyToken = localStorage.getItem(TOKEN_KEY);
	if(!legacyToken) return null;

	try {
		const userData = JSON.parse(localStorage.getItem(USER_KEY) || '{}') as StoredUser;
		return {
			token: legacyToken,
			userData: {
				login: userData.login || 'admin',
				name: userData.name || 'Admin',
				role: userData.role || 'Администратор',
			},
			expiresAt: Date.now() + 8 * 60 * 60 * 1000,
		};
	}
	catch {
		return null;
	}
}

export const useUserStore = defineStore('user', {
	state: () => {
		const session = readStoredSession();

		return {
			token: session?.token || null as string | null,
			userData: session?.userData || null as StoredUser | null,
			expiresAt: session?.expiresAt || null as number | null,
		};
	},
	getters: {
		isAuthenticated: (state) => Boolean(state.token && state.expiresAt && state.expiresAt > Date.now()),
	},
	actions: {
		saveSession(session: StoredSession) {
			this.token = session.token;
			this.userData = session.userData;
			this.expiresAt = session.expiresAt;

			if(!import.meta.browser) return;
			localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
			localStorage.setItem(TOKEN_KEY, session.token);
			localStorage.setItem(USER_KEY, JSON.stringify(session.userData));
		},

		setData(data: any) {
			if(!data || !data.token) {
				console.error('Token не получен!');
			}

			this.saveSession({
				token: data.token,
				userData: data.userData,
				expiresAt: Date.now() + 8 * 60 * 60 * 1000,
			});
		},

		async signIn(login: string, password: string, rememberMe = false) {
			const config = useRuntimeConfig();
			const normalizedLogin = login.trim();
			const expectedLogin = String(config.public.authLogin || '');
			const expectedHash = String(config.public.authPasswordHash || '');
			const actualHash = await sha256(password);

			console.log('Attempting login with', { normalizedLogin, expectedLogin, actualHash, expectedHash });
			if(normalizedLogin !== expectedLogin || actualHash !== expectedHash) {
				return false;
			}

			this.saveSession({
				token: `static-${createToken()}`,
				userData: {
					login: normalizedLogin,
					name: 'Admin',
					role: 'Администратор',
				},
				expiresAt: Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000),
			});

			return true;
		},

		loadFromStorage() {
			const session = readStoredSession();
			if(session) this.saveSession(session);
			else this.reset();
		},

		reset() {
			this.token = null;
			this.userData = null;
			this.expiresAt = null;

			if(!import.meta.browser) return;
			localStorage.removeItem(AUTH_SESSION_KEY);
			localStorage.removeItem(TOKEN_KEY);
			localStorage.removeItem(USER_KEY);
		}
	}
});

// if(import.meta.hot) {
//   import.meta.hot.accept(acceptHMRUpdate(useUserStore, import.meta.hot))
// }
