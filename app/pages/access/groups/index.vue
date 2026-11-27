<template>
	<section class="access-groups-page">
		<BaseBreadcrumbs :breadcrumbs="[{ title: 'Главная', link: '/' }, { title: 'Доступ' }, { title: 'Группы' }]"/>

		<div class="agp-header">
			<h1 class="agp-title">Группы</h1>
			<div class="agp-header-actions">
				<BaseButton variant="secondary" prependIcon="mdi-refresh" :disabled="isLoading" @click="fetchGroups">Обновить</BaseButton>
				<BaseButton :prependIcon="isFormVisible ? 'mdi-close' : 'mdi-plus'" @click="toggleForm">{{ isFormVisible ? 'Закрыть' : 'Создать группу' }}</BaseButton>
			</div>
		</div>

		<div v-if="error" class="agp-message">
			<BaseIcon name="mdi-alert-circle" size="1.2em"/>
			<span>{{ error }}</span>
		</div>

		<BaseIsland v-if="isFormVisible" title="Новая группа" prependIcon="mdi-account-multiple-plus">
			<form class="agp-form" @submit.prevent="createGroup">
				<div class="agp-form-grid">
					<BaseTextBox v-model="form.name" label="Название" :error="formError"/>
					<BaseTextBox v-model="form.icon" label="Иконка" placeholder="mdi-account-group" :prependIcon="form.icon || undefined"/>
					<BaseTextBox v-model="form.description" label="Описание"/>
				</div>
				<div class="agp-form-actions">
					<BaseButton prependIcon="mdi-content-save" :disabled="isSubmitting" @click="createGroup">Создать и настроить права</BaseButton>
				</div>
			</form>
		</BaseIsland>

		<BaseIsland title="Список групп" prependIcon="mdi-account-group">
			<div class="agp-filters">
				<BaseTextBox v-model="filters.find" label="Поиск" placeholder="Название" prependIcon="mdi-magnify" @update:modelValue="fetchGroups"/>
				<BaseAutocomplete v-model="filters.status" label="Статус" :items="statusOptions" @change="fetchGroups"/>
			</div>

			<BaseTable :columns="columns" :rows="groups" :loading="isLoading" @row:click="openGroup">
				<template #cell.name="{ row }">
					<div class="agp-group">
						<div class="agp-icon">
							<BaseIcon :name="String(row.icon || 'mdi-account-group')" size="1.3em"/>
						</div>
						<div>
							<div class="agp-name">{{ row.name }}</div>
							<div class="agp-sub">{{ row.description || 'без описания' }}</div>
						</div>
					</div>
				</template>

				<template #cell.membersCount="{ value }">
					<span class="agp-count">
						<BaseIcon name="mdi-account" size="1.1em"/>
						{{ value }}
					</span>
				</template>

				<template #cell.permissions="{ row }">
					<div class="agp-perms">
						<span v-for="grant of (row as GroupDetails).permissions" :key="grant.key" class="agp-perm" :title="LEVEL_LABELS[grant.level]">
							{{ grant.key }}<sup class="agp-level">{{ grant.level }}</sup>
						</span>
						<span v-if="!(row as GroupDetails).permissions.length" class="agp-sub">нет прав</span>
					</div>
				</template>

				<template #cell.isActive="{ value }">
					<span :class="['agp-status', { inactive: !value }]">{{ value ? 'Активна' : 'Отключена' }}</span>
				</template>

				<template #cell.open>
					<BaseIcon name="mdi-chevron-right" size="1.4em" class="agp-chevron"/>
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
import { LEVEL_LABELS, useAccessStore, type GroupDetails } from '~/stores/AccessStore';

definePageMeta({
	layout: 'sidebar'
});

const access = useAccessStore();

const columns = [
	{ key: 'name', label: 'Группа' },
	{ key: 'membersCount', label: 'Участники' },
	{ key: 'permissions', label: 'Права' },
	{ key: 'isActive', label: 'Статус' },
	{ key: 'open', label: '', width: '1%' },
];
const statusOptions = [{ key: 'all', value: 'Все' }, { key: 'active', value: 'Активные' }, { key: 'inactive', value: 'Отключённые' }];

const groups = ref<GroupDetails[]>([]);
const isLoading = ref(false);
const isSubmitting = ref(false);
const isFormVisible = ref(false);
const error = ref('');
const formError = ref('');
const filters = reactive({ find: '', status: 'all' });
const form = reactive({ name: '', icon: '', description: '' });

onMounted(fetchGroups);

async function fetchGroups() {
	isLoading.value = true;
	try {
		const result = await access.listGroups({
			size: 100,
			find: filters.find.trim() || undefined,
			isActive: filters.status === 'all' ? undefined : filters.status === 'active',
		});
		groups.value = result.content;
	}
	catch(e) {
		error.value = e instanceof Error ? e.message : 'Ошибка запроса';
	}
	finally {
		isLoading.value = false;
	}
}

function toggleForm() {
	isFormVisible.value = !isFormVisible.value;
	Object.assign(form, { name: '', icon: '', description: '' });
	formError.value = '';
}

async function createGroup() {
	formError.value = form.name.trim() ? '' : 'Обязательное поле';
	if(formError.value) return;

	isSubmitting.value = true;
	try {
		const group = await access.createGroup({ name: form.name.trim(), icon: form.icon.trim() || null, description: form.description.trim() || null });
		await navigateTo(`/access/groups/${group.id}`);
	}
	catch(e) {
		formError.value = e instanceof Error ? e.message : 'Ошибка запроса';
	}
	finally {
		isSubmitting.value = false;
	}
}

function openGroup(row: Record<string, unknown>) {
	navigateTo(`/access/groups/${row.id}`);
}
</script>

<style lang="scss">
.access-groups-page {
	display: flex;
	flex-direction: column;
	gap: 1em;
	color: #172b4d;

	.agp-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1em;

		.agp-title {
			margin: 0;
			font-size: 28px;
			line-height: 1.2em;
		}

		.agp-header-actions {
			display: flex;
			gap: .7em;
		}
	}

	.agp-message {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 12px;
		border-radius: 8px;
		background: #f8e7e7;
		color: #d32f2f;
		font-size: 13px;
	}

	.agp-form {
		display: flex;
		flex-direction: column;
		gap: 1em;

		.agp-form-grid {
			display: grid;
			grid-template-columns: 1fr 1fr 2fr;
			gap: 1em;
		}
	}

	.agp-filters {
		display: flex;
		align-items: flex-end;
		gap: 1em;
		margin-bottom: 1em;
	}

	.base-table-row {
		cursor: pointer;

		&:hover {
			background: #f8fafc;
		}
	}

	.agp-group {
		display: flex;
		align-items: center;
		gap: .8em;

		.agp-icon {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 2.2em;
			height: 2.2em;
			border-radius: 8px;
			background: #eef4ff;
			color: #114bc8;
		}

		.agp-name {
			font-weight: 600;
		}
	}

	.agp-sub {
		color: #737373;
		font-size: .9em;
		white-space: normal;
	}

	.agp-count {
		display: inline-flex;
		align-items: center;
		gap: .3em;
		color: #525252;
	}

	.agp-perms {
		display: flex;
		gap: .3em;
		flex-wrap: wrap;
		white-space: normal;

		.agp-perm {
			padding: .15em .6em;
			border-radius: 4px;
			background: #f1f5f9;
			color: #334155;
			font-size: .8em;
			font-family: monospace;

			.agp-level {
				margin-left: .15em;
				color: #2563ea;
			}
		}
	}

	.agp-status {
		padding: .2em .8em;
		border-radius: 999px;
		background: #e7f8ef;
		color: #058039;
		font-size: .85em;
		font-weight: 600;

		&.inactive {
			background: #f1f5f9;
			color: #737373;
		}
	}

	.agp-chevron {
		color: #a3a3a3;
	}
}
</style>
