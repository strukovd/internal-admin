<template>
	<section class="access-permissions-page">
		<BaseBreadcrumbs :breadcrumbs="[{ title: 'Главная', link: '/' }, { title: 'Доступ' }, { title: 'Права' }]"/>

		<div class="app-header">
			<h1 class="app-title">Права</h1>
			<BaseTextBox v-model="find" placeholder="Ключ или название" prependIcon="mdi-magnify"/>
		</div>

		<div class="app-hint">
			Справочник прав. Новое право появляется вместе с кодом, который его проверяет (<code>@HasPermission('KEY')</code>),
			поэтому здесь можно менять только название и описание. Выдаются права группам - в карточке группы.
		</div>

		<div v-if="error" class="app-error">{{ error }}</div>

		<div class="app-list">
			<BaseIsland v-for="permission of filtered" :key="permission.id">
				<div v-if="editingId !== permission.id" class="app-item">
					<div class="app-item-main">
						<div class="app-item-name">
							{{ permission.name }}
							<code class="app-key">{{ permission.key }}</code>
						</div>
						<div class="app-sub">{{ permission.description || 'без описания' }}</div>

						<div v-if="permission.modifiers.length" class="app-modifiers">
							<span class="app-label">Модификаторы:</span>
							<span v-for="modifier of permission.modifiers" :key="modifier.key" class="app-modifier" :title="modifier.description ?? ''">
								{{ modifier.name }} <code class="app-key">{{ modifier.key }}</code>
							</span>
						</div>

						<div class="app-groups">
							<span class="app-label">Выдано группам:</span>
							<NuxtLink v-for="usage of usages(permission.key)" :key="usage.group.id" :to="`/access/groups/${usage.group.id}`" class="app-group">
								{{ usage.group.name }} · {{ LEVEL_LABELS[usage.level].toLowerCase() }}
							</NuxtLink>
							<span v-if="!usages(permission.key).length" class="app-sub">никому</span>
						</div>
					</div>
					<BaseButton variant="secondary" prependIcon="mdi-pencil" title="Изменить" @click="startEdit(permission)"/>
				</div>

				<form v-else class="app-edit" @submit.prevent="saveEdit">
					<div class="app-edit-grid">
						<BaseTextBox v-model="edit.name" label="Название" :error="edit.error"/>
						<BaseTextBox v-model="edit.description" label="Описание"/>
					</div>
					<div class="app-edit-actions">
						<BaseButton prependIcon="mdi-content-save" @click="saveEdit">Сохранить</BaseButton>
						<BaseButton variant="secondary" @click="editingId = null">Отмена</BaseButton>
					</div>
				</form>
			</BaseIsland>
		</div>
	</section>
</template>

<script lang="ts" setup>
import BaseBreadcrumbs from '~/components/common/base/BaseBreadcrumbs.vue';
import BaseButton from '~/components/common/base/BaseButton.vue';
import BaseIsland from '~/components/common/base/BaseIsland.vue';
import BaseTextBox from '~/components/common/base/BaseTextBox.vue';
import { LEVEL_LABELS, useAccessStore, type AccessPermission } from '~/stores/AccessStore';

definePageMeta({
	layout: 'sidebar'
});

const access = useAccessStore();
const find = ref('');
const editingId = ref<number | null>(null);
const edit = reactive({ name: '', description: '', error: '' });
const error = ref('');

onMounted(async () => {
	try {
		await Promise.all([access.loadPermissions(), access.loadGroups()]);
	}
	catch(e) {
		error.value = e instanceof Error ? e.message : 'Ошибка запроса';
	}
});

// Справочник небольшой - фильтруем на месте, без запроса на каждый символ
const filtered = computed(() => access.permissions.filter(p =>
	!find.value || [p.key, p.name].some(value => value.toLowerCase().includes(find.value.toLowerCase())),
));

/** Какие группы и с каким уровнем имеют право (по правам из groups.list) */
function usages(key: string) {
	return access.groups.flatMap(group => {
		const grant = group.permissions.find(g => g.key === key);
		return grant ? [{ group, level: grant.level }] : [];
	});
}

function startEdit(permission: AccessPermission) {
	Object.assign(edit, { name: permission.name, description: permission.description ?? '', error: '' });
	editingId.value = permission.id;
}

async function saveEdit() {
	edit.error = edit.name.trim() ? '' : 'Обязательное поле';
	if(edit.error) return;
	try {
		await access.updatePermission(editingId.value!, { name: edit.name.trim(), description: edit.description.trim() || null });
		editingId.value = null;
	}
	catch(e) {
		edit.error = e instanceof Error ? e.message : 'Ошибка запроса';
	}
}
</script>

<style lang="scss">
.access-permissions-page {
	display: flex;
	flex-direction: column;
	gap: 1em;
	color: #172b4d;

	.app-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1em;

		.app-title {
			margin: 0;
			font-size: 28px;
			line-height: 1.2em;
		}
	}

	.app-hint {
		padding: .7em 1em;
		border-radius: 8px;
		background: #f8fafc;
		color: #525252;
		font-size: .85em;
	}

	.app-error {
		padding: 10px 12px;
		border-radius: 8px;
		background: #f8e7e7;
		color: #d32f2f;
		font-size: 13px;
	}

	.app-key {
		margin-left: .4em;
		padding: .1em .5em;
		border-radius: 4px;
		background: #f1f5f9;
		color: #64748b;
		font-size: .75em;
		font-weight: 400;
	}

	.app-sub {
		color: #737373;
		font-size: .9em;
	}

	.app-label {
		color: #a3a3a3;
		font-size: .85em;
	}

	.app-list {
		display: flex;
		flex-direction: column;
		gap: .8em;

		.app-item {
			display: flex;
			align-items: flex-start;
			gap: 1em;

			.app-item-main {
				display: flex;
				flex-direction: column;
				gap: .4em;
				flex: auto 1 1;

				.app-item-name {
					font-size: 1.1rem;
					font-weight: 700;
				}

				.app-modifiers,
				.app-groups {
					display: flex;
					align-items: center;
					gap: .5em;
					flex-wrap: wrap;
				}

				.app-modifier {
					padding: .15em .6em;
					border-radius: 999px;
					background: #fff7ed;
					color: #9a3412;
					font-size: .85em;
				}

				.app-group {
					padding: .15em .7em;
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
		}

		.app-edit {
			display: flex;
			flex-direction: column;
			gap: 1em;

			.app-edit-grid {
				display: grid;
				grid-template-columns: 1fr 2fr;
				gap: 1em;
			}

			.app-edit-actions {
				display: flex;
				gap: .7em;
			}
		}
	}
}
</style>
