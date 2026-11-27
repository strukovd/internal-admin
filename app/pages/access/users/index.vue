<template>
	<section class="access-users-page">
		<BaseBreadcrumbs :breadcrumbs="[{ title: 'Главная', link: '/' }, { title: 'Доступ' }, { title: 'Пользователи' }]"/>

		<div class="aup-header">
			<h1 class="aup-title">Пользователи</h1>
			<div class="aup-header-actions">
				<BaseButton variant="secondary" prependIcon="mdi-refresh" :disabled="isLoading" @click="fetchUsers">Обновить</BaseButton>
				<BaseButton prependIcon="mdi-account-plus" @click="openCreate">Добавить пользователя</BaseButton>
			</div>
		</div>

		<div v-if="message && message.text" :class="['aup-message', message.type]">
			<BaseIcon :name="message.type === 'error' ? 'mdi-alert-circle' : 'mdi-check-circle'" size="1.2em"/>
			<span>{{ message.text }}</span>
		</div>

		<BaseIsland title="Список пользователей" prependIcon="mdi-account-multiple">
			<div class="aup-filters">
				<BaseTextBox v-model="filters.find" label="Поиск" placeholder="Логин или имя" prependIcon="mdi-magnify" @update:modelValue="applyFilters"/>
				<BaseAutocomplete v-model="filters.status" label="Статус" :items="statusOptions" @change="applyFilters"/>
				<BaseAutocomplete v-model="filters.groupId" label="Группа" :items="groupOptions" @change="applyFilters"/>
			</div>

			<BaseTable
				:key="`users-${page}`"
				:columns="columns"
				:rows="users"
				:loading="isLoading"
				pageable
				:page="page"
				:limit="size"
				:total="total"
				@page:change="changePage"
			>
				<template #cell.user="{ row }">
					<div class="aup-user">
						<div class="aup-avatar">{{ String(row.name)[0] }}</div>
						<div>
							<div class="aup-name">{{ row.name }}</div>
							<div class="aup-sub">{{ row.username }}</div>
						</div>
					</div>
				</template>

				<template #cell.groups="{ row }">
					<div class="aup-chips">
						<NuxtLink v-for="group of (row as AccessUserListItem).groups" :key="group.id" :to="`/access/groups/${group.id}`" class="aup-chip">{{ group.name }}</NuxtLink>
					</div>
				</template>

				<template #cell.isActive="{ value }">
					<span :class="['aup-status', { blocked: !value }]">{{ value ? 'Активен' : 'Заблокирован' }}</span>
				</template>

				<template #cell.lastAuthAt="{ value }">
					<span class="aup-sub">{{ value ? formatDateTime(String(value)) : 'не входил' }}</span>
				</template>

				<template #cell.actions="{ row }">
					<div class="aup-actions">
						<BaseButton variant="secondary" prependIcon="mdi-pencil" title="Изменить" @click="openEdit(row as AccessUser)"/>
						<BaseButton variant="secondary" color="#1572be" prependIcon="mdi-lock-reset" title="Сбросить пароль" @click="openPassword(row as AccessUser)"/>
						<BaseButton variant="secondary" color="#d32f2f" :prependIcon="row.isActive ? 'mdi-lock' : 'mdi-account-check'" :title="row.isActive ? 'Заблокировать' : 'Разблокировать'" @click="toggleActive(row as AccessUser)"/>
						<BaseButton variant="secondary" color="#7622c2" prependIcon="mdi-delete" title="Удалить" @click="removeUser(row as AccessUser)"/>
					</div>
				</template>
			</BaseTable>
		</BaseIsland>
	</section>
</template>

<script lang="ts" setup>
import BaseAutocomplete from '~/components/common/base/BaseAutocomplete.vue';
import BaseBreadcrumbs from '~/components/common/base/BaseBreadcrumbs.vue';
import BaseButton from '~/components/common/base/BaseButton.vue';
import BaseIcon from '~/components/common/base/BaseIcon.vue';
import BaseIsland from '~/components/common/base/BaseIsland.vue';
import BaseTable from '~/components/common/base/BaseTable.vue';
import BaseTextBox from '~/components/common/base/BaseTextBox.vue';
import type { UserEditResult } from '~/components/modals/UserEdit.vue';
import { useAccessStore, type AccessUser, type AccessUserListItem } from '~/stores/AccessStore';

definePageMeta({
	layout: 'sidebar'
});

const access = useAccessStore();
const { $modal } = useNuxtApp();

const columns = [
	{ key: 'user', label: 'Пользователь' },
	{ key: 'position', label: 'Должность' },
	{ key: 'groups', label: 'Группы' },
	{ key: 'isActive', label: 'Статус' },
	{ key: 'lastAuthAt', label: 'Последний вход', appendIcon: { name: 'mdi-help-circle-outline', title: '«Последний ввод пароля», а не «последняя активность».' } },
	{ key: 'actions', label: '', width: '1%' },
];

const statusOptions = [{ key: 'all', value: 'Все' }, { key: 'active', value: 'Активные' }, { key: 'blocked', value: 'Заблокированные' }];
const groupOptions = computed(() => [{ key: 0, value: 'Все' }, ...access.groups.map(group => ({ key: group.id, value: group.name }))]);

const users = ref<AccessUserListItem[]>([]);
const total = ref(0);
const page = ref(1);
const size = 10;
const isLoading = ref(false);
const filters = reactive({ find: '', status: 'all', groupId: 0 });
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null);

onMounted(() => {
	fetchUsers();
	// Группы для фильтра
	access.loadGroups().catch(showError);
});

async function fetchUsers() {
	isLoading.value = true;
	try {
		const result = await access.listUsers({
			page: page.value,
			size,
			find: filters.find.trim() || undefined,
			isActive: filters.status === 'all' ? undefined : filters.status === 'active',
			groupId: filters.groupId || undefined,
		});
		users.value = result.content;
		total.value = result.pagination.totalElements;
	}
	catch(error) {
		showError(error);
	}
	finally {
		isLoading.value = false;
	}
}

function applyFilters() {
	page.value = 1;
	fetchUsers();
}

function changePage(next: number) {
	page.value = next;
	fetchUsers();
}

// Формы открываются в модалках (components/modals): они сами сохраняют и возвращают результат.
// nonCloseable - клик мимо окна не теряет введённые данные
async function openCreate() {
	const result: UserEditResult = await $modal.show('UserEdit', { title: 'Новый пользователь', nonCloseable: true });
	if(!result) return;
	showSuccess(`Пользователь ${result.user.username} создан`);
	await fetchUsers();
	if(result.generatedPassword) {
		await $modal.show('GeneratedPassword', { title: 'Пароль сгенерирован', payload: { username: result.user.username, password: result.generatedPassword }, nonCloseable: true });
	}
}

async function openEdit(user: AccessUser) {
	const result: UserEditResult = await $modal.show('UserEdit', { title: `Редактирование: ${user.username}`, payload: { user }, nonCloseable: true });
	if(!result) return;
	showSuccess('Изменения сохранены');
	await fetchUsers();
}

async function openPassword(user: AccessUser) {
	const changed = await $modal.show('UserPassword', { title: `Сброс пароля: ${user.username}`, payload: { user }, nonCloseable: true });
	if(changed) showSuccess(`Пароль ${user.username} изменён`);
}

async function toggleActive(user: AccessUser) {
	try {
		await access.setUserActive(user.id, !user.isActive);
		showSuccess(user.isActive ? `${user.username} заблокирован` : `${user.username} разблокирован`);
		await fetchUsers();
	}
	catch(error) {
		showError(error);
	}
}

async function removeUser(user: AccessUser) {
	const confirmed = await $modal.show('ConfirmModal', { payload: { title: 'Удалить пользователя?', description: `${user.name} (${user.username})` } });
	if(!confirmed) return;
	try {
		await access.removeUser(user.id);
		showSuccess(`${user.username} удалён`);
		await fetchUsers();
	}
	catch(error) {
		showError(error);
	}
}

function showSuccess(text: string) {
	message.value = { type: 'success', text };
}

function showError(error: unknown) {
	message.value = { type: 'error', text: error instanceof Error ? error.message : 'Ошибка запроса' };
}

function formatDateTime(value: string) {
	return new Date(value).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
</script>

<style lang="scss">
.access-users-page {
	display: flex;
	flex-direction: column;
	gap: 1em;
	color: #172b4d;

	.aup-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1em;

		.aup-title {
			margin: 0;
			font-size: 28px;
			line-height: 1.2em;
		}

		.aup-header-actions {
			display: flex;
			gap: .7em;
		}
	}

	.aup-message {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 12px;
		border-radius: 8px;
		font-size: 13px;

		&.success {
			background: #e7f8ef;
			color: #058039;
		}

		&.error {
			background: #f8e7e7;
			color: #d32f2f;
		}
	}

	.aup-filters {
		display: flex;
		align-items: flex-end;
		gap: 1em;
		flex-wrap: wrap;
		margin-bottom: 1em;
	}

	.aup-user {
		display: flex;
		align-items: center;
		gap: .7em;

		.aup-avatar {
			width: 2em;
			line-height: 2em;
			border-radius: 50%;
			background: #2563ea;
			color: #fff;
			font-weight: 700;
			text-align: center;
		}

		.aup-name {
			font-weight: 600;
		}
	}

	.aup-sub {
		color: #737373;
		font-size: .9em;
	}

	.aup-chips {
		display: flex;
		gap: .4em;
		flex-wrap: wrap;

		.aup-chip {
			padding: .2em .7em;
			border-radius: 999px;
			background: #eef4ff;
			color: #114bc8;
			font-size: .85em;
			text-decoration: none;

			&:hover {
				background: #dbe7ff;
			}
		}
	}

	.aup-status {
		padding: .2em .8em;
		border-radius: 999px;
		background: #e7f8ef;
		color: #058039;
		font-size: .85em;
		font-weight: 600;

		&.blocked {
			background: #f8e7e7;
			color: #d32f2f;
		}
	}

	.aup-actions {
		display: flex;
		gap: .4em;
	}
}
</style>
