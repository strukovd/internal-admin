import { defineStore } from 'pinia';
import { AuthError, type PageableResponseDTO, type ResponseDTO } from '~/plugins/auth';

/*
 * Раздел «Доступ»: пользователи, группы и права из auth-handler (REST /api/v1, клиент $auth).
 * Страницы читают справочники из state (permissions, groups), загружая их load*-методами.
 */

export enum PermissionLevel {
	READ = 1,
	WRITE = 2,
	DELETE = 3,
}

export const LEVEL_LABELS: Record<PermissionLevel, string> = {
	[PermissionLevel.READ]: 'Чтение',
	[PermissionLevel.WRITE]: 'Запись',
	[PermissionLevel.DELETE]: 'Удаление',
};

export type AccessUser = {
	id: number;
	username: string;
	name: string;
	position: string | null;
	parentId: number | null;
	/** Путь или URL картинки (users.avatar) */
	avatar: string | null;
	isActive: boolean;
	/** Последний вход по логину и паролю */
	lastAuthAt: string | null;
	/** Последняя активность: вход или refresh (точность ~15 мин) */
	lastSeenAt: string | null;
	created: string;
};

export type AccessGroup = {
	id: number;
	name: string;
	description: string | null;
	icon: string | null;
	isActive: boolean;
	created: string;
};

export type AccessModifier = { key: string; name: string; description: string | null };

export type AccessPermission = {
	id: number;
	key: string;
	name: string;
	description: string | null;
	modifiers: AccessModifier[];
};

export type GroupPermission = { key: string; level: PermissionLevel; modifiers: string[] };

export type GroupDetails = AccessGroup & { membersCount: number; permissions: (GroupPermission & { name: string })[] };

/** Пользователь в списке: с группами, в которых состоит */
export type AccessUserListItem = AccessUser & { groups: Pick<AccessGroup, 'id' | 'name'>[] };

export type Page<T> = { content: T[]; pagination: PageableResponseDTO<T>['pagination'] };

type ListQuery = { page?: number; size?: number; find?: string; isActive?: boolean };

/** Наибольший size, который принимает API (PageableQueryDto) */
const MAX_PAGE_SIZE = 500;

/** Пользователь в ответе API: связь parent приходит как id (или объект, если её подгрузили) */
type RawUser = Omit<AccessUser, 'parentId'> & { parent?: number | { id: number } | null };

function toUser(raw: RawUser): AccessUser {
	const { parent, ...user } = raw;
	return { ...user, parentId: (typeof parent === 'object' ? parent?.id : parent) ?? null };
}

function api() {
	return useNuxtApp().$auth;
}

export const useAccessStore = defineStore('access', {
	state: () => ({
		/** Справочник прав (loadPermissions) */
		permissions: [] as AccessPermission[],
		/** Все группы с правами и числом участников: фильтры, подписи, «кто имеет право» (loadGroups) */
		groups: [] as GroupDetails[],
	}),

	actions: {
		// ---------- справочники для страниц ----------

		async loadPermissions() {
			this.permissions = (await this.listPermissions({ size: MAX_PAGE_SIZE })).content;
		},

		async loadGroups() {
			this.groups = (await this.listGroups({ size: MAX_PAGE_SIZE })).content;
		},

		// ---------- users ----------

		async listUsers(query: ListQuery & { ids?: number[]; groupId?: number }): Promise<Page<AccessUserListItem>> {
			const page = await api().fetch<PageableResponseDTO<RawUser & Pick<AccessUserListItem, 'groups'>>>('/users', { query: { ...query, ids: query.ids?.join(',') } });
			return { content: page.content.map(user => ({ ...toUser(user), groups: user.groups })), pagination: page.pagination };
		},

		async createUser(dto: { username: string; name: string; position?: string | null; parentId?: number | null; avatar?: string | null; password?: string }): Promise<AccessUser & { generatedPassword?: string }> {
			const body = await api().fetch<ResponseDTO<RawUser & { generatedPassword?: string }>>('/users', { method: 'POST', body: dto });
			return { ...toUser(body.content), generatedPassword: body.content.generatedPassword };
		},

		async updateUser(id: number, dto: Partial<Pick<AccessUser, 'username' | 'name' | 'position' | 'parentId' | 'avatar'>>): Promise<AccessUser> {
			const body = await api().fetch<ResponseDTO<RawUser>>(`/users/${id}`, { method: 'PATCH', body: dto });
			return toUser(body.content);
		},

		/**
		 * Загрузка аватара, возвращает ссылку для users.avatar.
		 * В API нет: хранилище не подключено (план - отдельная папка на сервере шлюза, как у файлов CMS) - пока отказ.
		 */
		async uploadAvatar(_file: File): Promise<string> {
			throw new AuthError(501, 'Загрузка фото пока не подключена');
		},

		async setUserActive(id: number, isActive: boolean): Promise<AccessUser> {
			const body = await api().fetch<ResponseDTO<RawUser>>(`/users/${id}/${isActive ? 'unblock' : 'block'}`, { method: 'POST' });
			return toUser(body.content);
		},

		async setUserPassword(id: number, password: string): Promise<void> {
			await api().fetch(`/users/${id}/password`, { method: 'PUT', body: { password } });
		},

		async removeUser(id: number): Promise<void> {
			await api().fetch(`/users/${id}`, { method: 'DELETE' });
		},

		// ---------- groups ----------

		/** Группы сразу с правами и числом участников */
		async listGroups(query: ListQuery): Promise<Page<GroupDetails>> {
			return api().fetch<PageableResponseDTO<GroupDetails>>('/groups', { query });
		},

		async getGroup(id: number): Promise<GroupDetails> {
			return (await api().fetch<ResponseDTO<GroupDetails>>(`/groups/${id}`)).content;
		},

		async createGroup(dto: { name: string; description?: string | null; icon?: string | null }): Promise<AccessGroup> {
			return (await api().fetch<ResponseDTO<AccessGroup>>('/groups', { method: 'POST', body: dto })).content;
		},

		async updateGroup(id: number, dto: Partial<Pick<AccessGroup, 'name' | 'description' | 'icon' | 'isActive'>>): Promise<AccessGroup> {
			return (await api().fetch<ResponseDTO<AccessGroup>>(`/groups/${id}`, { method: 'PATCH', body: dto })).content;
		},

		async removeGroup(id: number): Promise<void> {
			await api().fetch(`/groups/${id}`, { method: 'DELETE' });
		},

		async addMembers(id: number, userIds: number[]): Promise<void> {
			await api().fetch(`/groups/${id}/users`, { method: 'POST', body: { userIds } });
		},

		async removeMembers(id: number, userIds: number[]): Promise<void> {
			await api().fetch(`/groups/${id}/users`, { method: 'DELETE', body: { userIds } });
		},

		async setGroupPermissions(id: number, permissions: GroupPermission[]): Promise<GroupDetails> {
			const group = (await api().fetch<ResponseDTO<GroupDetails>>(`/groups/${id}/permissions`, { method: 'PUT', body: { permissions } })).content;
			const cached = this.groups.find(g => g.id === id);
			if(cached) cached.permissions = group.permissions;
			return group;
		},

		// ---------- permissions ----------

		async listPermissions(query: ListQuery): Promise<Page<AccessPermission>> {
			return api().fetch<PageableResponseDTO<AccessPermission>>('/permissions', { query });
		},

		async updatePermission(id: number, dto: { name?: string; description?: string | null }): Promise<AccessPermission> {
			const updated = (await api().fetch<ResponseDTO<AccessPermission>>(`/permissions/${id}`, { method: 'PATCH', body: dto })).content;
			// В ответе update нет модификаторов - в справочнике меняем только изменённые поля
			const permission = this.permissions.find(p => p.id === id);
			if(permission) Object.assign(permission, { name: updated.name, description: updated.description });
			return permission ?? updated;
		},
	},
});
