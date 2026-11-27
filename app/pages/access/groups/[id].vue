<template>
	<section class="access-group-page">
		<BaseBreadcrumbs :breadcrumbs="[{ title: 'Главная', link: '/' }, { title: 'Доступ' }, { title: 'Группы', link: '/access/groups' }, { title: group?.name ?? '...' }]"/>

		<div v-if="message" :class="['agc-message', message.type]">
			<BaseIcon :name="message.type === 'error' ? 'mdi-alert-circle' : 'mdi-check-circle'" size="1.2em"/>
			<span>{{ message.text }}</span>
		</div>

		<template v-if="group">
			<!-- Шапка: общие данные группы -->
			<BaseIsland>
				<div v-if="!isEditing" class="agc-head">
					<div class="agc-icon">
						<BaseIcon :name="group.icon || 'mdi-account-group'" size="1.8em"/>
					</div>
					<div class="agc-info">
						<div class="agc-name">
							{{ group.name }}
							<span :class="['agc-status', { inactive: !group.isActive }]">{{ group.isActive ? 'Активна' : 'Отключена' }}</span>
						</div>
						<div class="agc-sub">{{ group.description || 'без описания' }}</div>
					</div>
					<div class="agc-head-actions">
						<BaseButton variant="secondary" prependIcon="mdi-pencil" @click="startEdit">Изменить</BaseButton>
						<BaseButton variant="secondary" :prependIcon="group.isActive ? 'mdi-pause-circle-outline' : 'mdi-play-circle-outline'" @click="toggleActive">
							{{ group.isActive ? 'Отключить' : 'Включить' }}
						</BaseButton>
						<BaseButton variant="secondary" color="#d32f2f" prependIcon="mdi-delete" @click="removeGroup">Удалить</BaseButton>
					</div>
				</div>

				<form v-else class="agc-edit" @submit.prevent="saveEdit">
					<div class="agc-edit-grid">
						<BaseTextBox v-model="edit.name" label="Название" :error="edit.error"/>
						<BaseTextBox v-model="edit.icon" label="Иконка" :prependIcon="edit.icon || undefined"/>
						<BaseTextBox v-model="edit.description" label="Описание"/>
					</div>
					<div class="agc-edit-actions">
						<BaseButton prependIcon="mdi-content-save" @click="saveEdit">Сохранить</BaseButton>
						<BaseButton variant="secondary" @click="isEditing = false">Отмена</BaseButton>
					</div>
				</form>
			</BaseIsland>

			<BaseTabs v-model="tab" :items="tabs"/>

			<!-- Права: весь справочник строками, у группы выбран уровень и модификаторы -->
			<BaseIsland v-if="tab === 'permissions'" title="Права группы" prependIcon="mdi-shield-key">
				<div class="agc-hint">
					Уровни включают друг друга: «Запись» даёт и чтение, «Удаление» - всё.
					Модификаторы - отдельные исключения внутри права, доступны когда право выдано.
				</div>

				<table class="agc-matrix">
					<thead>
						<tr>
							<th class="agc-col-perm">Право</th>
							<th>Уровень</th>
							<th>Модификаторы</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="permission of access.permissions" :key="permission.key" :class="{ granted: draft[permission.key]?.level, changed: isChanged(permission.key) }">
							<td class="agc-col-perm">
								<div class="agc-perm-name">{{ permission.name }}</div>
								<div class="agc-perm-key">{{ permission.key }}</div>
							</td>
							<td>
								<div class="agc-levels">
									<button
										v-for="option of levelOptions" :key="option.level"
										type="button"
										:class="['agc-level', { selected: (draft[permission.key]?.level ?? 0) === option.level }]"
										@click="setLevel(permission.key, option.level)"
									>{{ option.label }}</button>
								</div>
							</td>
							<td>
								<div v-if="permission.modifiers.length" class="agc-modifiers">
									<BaseCheckbox
										v-for="modifier of permission.modifiers" :key="modifier.key"
										:modelValue="draft[permission.key]?.modifiers.includes(modifier.key) ?? false"
										:label="modifier.name"
										:disabled="!draft[permission.key]?.level"
										:title="`${modifier.key}: ${modifier.description ?? ''}`"
										@update:modelValue="toggleModifier(permission.key, modifier.key, $event)"
									/>
								</div>
								<span v-else class="agc-sub">-</span>
							</td>
						</tr>
					</tbody>
				</table>

				<div class="agc-matrix-footer">
					<span class="agc-sub">{{ changedCount ? `Изменено прав: ${changedCount}` : 'Изменений нет' }}</span>
					<div class="agc-matrix-actions">
						<BaseButton variant="secondary" prependIcon="mdi-undo" :disabled="!changedCount" @click="resetDraft">Сбросить</BaseButton>
						<BaseButton prependIcon="mdi-content-save" :disabled="!changedCount || isSaving" @click="savePermissions">Сохранить права</BaseButton>
					</div>
				</div>
			</BaseIsland>

			<!-- Участники: users.list?groupId= + добавление и удаление -->
			<BaseIsland v-else title="Участники" prependIcon="mdi-account-multiple">
				<div class="agc-add">
					<UserPicker v-model="newMemberId" label="Добавить пользователя" :excludeIds="members.map(member => member.id)"/>
					<BaseButton prependIcon="mdi-account-plus" :disabled="!newMemberId" @click="addMember">Добавить</BaseButton>
				</div>

				<BaseTable :columns="memberColumns" :rows="members" :loading="isMembersLoading">
					<template #cell.name="{ row }">
						<div class="agc-perm-name">{{ row.name }}</div>
						<div class="agc-sub">{{ row.username }}</div>
					</template>
					<template #cell.isActive="{ value }">
						<span :class="['agc-status', { blocked: !value }]">{{ value ? 'Активен' : 'Заблокирован' }}</span>
					</template>
					<template #cell.actions="{ row }">
						<BaseButton variant="secondary" color="#d32f2f" prependIcon="mdi-account-remove" title="Убрать из группы" @click="removeMember(row as AccessUser)"/>
					</template>
				</BaseTable>
			</BaseIsland>
		</template>
	</section>
</template>

<script lang="ts" setup>
import BaseBreadcrumbs from '~/components/common/base/BaseBreadcrumbs.vue';
import UserPicker from '~/components/UserPicker.vue';
import BaseButton from '~/components/common/base/BaseButton.vue';
import BaseCheckbox from '~/components/common/base/BaseCheckbox.vue';
import BaseIcon from '~/components/common/base/BaseIcon.vue';
import BaseIsland from '~/components/common/base/BaseIsland.vue';
import BaseTable from '~/components/common/base/BaseTable.vue';
import BaseTabs from '~/components/common/base/BaseTabs.vue';
import BaseTextBox from '~/components/common/base/BaseTextBox.vue';
import { LEVEL_LABELS, PermissionLevel, useAccessStore, type AccessUser, type GroupDetails, type GroupPermission } from '~/stores/AccessStore';

definePageMeta({
	layout: 'sidebar'
});

const route = useRoute();
const access = useAccessStore();
const groupId = Number(route.params.id);

const group = ref<GroupDetails | null>(null);
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null);
const tab = ref<'permissions' | 'members'>('permissions');
const tabs = computed(() => [
	{ key: 'permissions', caption: 'Права', icon: 'mdi-shield-key' },
	{ key: 'members', caption: `Участники (${group.value?.membersCount ?? 0})`, icon: 'mdi-account-multiple' },
]);

const levelOptions = [
	{ level: 0, label: 'Нет' },
	...[PermissionLevel.READ, PermissionLevel.WRITE, PermissionLevel.DELETE].map(level => ({ level, label: LEVEL_LABELS[level] })),
];

onMounted(async () => {
	// Справочник прав - строки матрицы
	await Promise.all([fetchGroup(), fetchMembers(), access.loadPermissions().catch(showError)]);
});

async function fetchGroup() {
	try {
		group.value = await access.getGroup(groupId);
		resetDraft();
	}
	catch(error) {
		showError(error);
	}
}

// ---------- шапка ----------

const isEditing = ref(false);
const edit = reactive({ name: '', icon: '', description: '', error: '' });

function startEdit() {
	Object.assign(edit, { name: group.value!.name, icon: group.value!.icon ?? '', description: group.value!.description ?? '', error: '' });
	isEditing.value = true;
}

async function saveEdit() {
	edit.error = edit.name.trim() ? '' : 'Обязательное поле';
	if(edit.error) return;
	try {
		await access.updateGroup(groupId, { name: edit.name.trim(), icon: edit.icon.trim() || null, description: edit.description.trim() || null });
		isEditing.value = false;
		await fetchGroup();
	}
	catch(error) {
		edit.error = error instanceof Error ? error.message : 'Ошибка запроса';
	}
}

async function toggleActive() {
	try {
		await access.updateGroup(groupId, { isActive: !group.value!.isActive });
		showSuccess(group.value!.isActive ? 'Группа отключена: её права больше не выдаются' : 'Группа включена');
		await fetchGroup();
	}
	catch(error) {
		showError(error);
	}
}

async function removeGroup() {
	if(!confirm(`Удалить группу «${group.value!.name}»? Участники потеряют её права.`)) return;
	try {
		await access.removeGroup(groupId);
		await navigateTo('/access/groups');
	}
	catch(error) {
		showError(error);
	}
}

// ---------- права ----------

/** Черновик: ключ права -> уровень и модификаторы. Отправляется целиком (PUT), как ждёт API */
const draft = ref<Record<string, GroupPermission>>({});
const isSaving = ref(false);

function resetDraft() {
	draft.value = Object.fromEntries((group.value?.permissions ?? []).map(p => [p.key, { key: p.key, level: p.level, modifiers: [...p.modifiers] }]));
}

function setLevel(key: string, level: number) {
	if(!level) {
		delete draft.value[key];
		return;
	}
	draft.value[key] = { key, level, modifiers: draft.value[key]?.modifiers ?? [] };
}

function toggleModifier(key: string, modifier: string, checked: boolean) {
	const grant = draft.value[key];
	if(!grant) return;
	grant.modifiers = checked ? [...grant.modifiers, modifier] : grant.modifiers.filter(m => m !== modifier);
}

function isChanged(key: string) {
	const saved = group.value?.permissions.find(p => p.key === key);
	const current = draft.value[key];
	if(!saved || !current) return Boolean(saved) !== Boolean(current);
	return saved.level !== current.level || [...saved.modifiers].sort().join() !== [...current.modifiers].sort().join();
}

const changedCount = computed(() => access.permissions.filter(p => isChanged(p.key)).length);

async function savePermissions() {
	isSaving.value = true;
	try {
		group.value = await access.setGroupPermissions(groupId, Object.values(draft.value));
		resetDraft();
		showSuccess('Права сохранены. У участников они обновятся при следующем входе или обновлении токена');
	}
	catch(error) {
		showError(error);
	}
	finally {
		isSaving.value = false;
	}
}

// ---------- участники ----------

const members = ref<AccessUser[]>([]);
const isMembersLoading = ref(false);
const newMemberId = ref<number | null>(null);
const memberColumns = [
	{ key: 'name', label: 'Пользователь' },
	{ key: 'position', label: 'Должность' },
	{ key: 'isActive', label: 'Статус' },
	{ key: 'actions', label: '', width: '1%' },
];

async function fetchMembers() {
	isMembersLoading.value = true;
	try {
		members.value = (await access.listUsers({ groupId, size: 500 })).content;
	}
	catch(error) {
		showError(error);
	}
	finally {
		isMembersLoading.value = false;
	}
}

async function addMember() {
	if(!newMemberId.value) return;
	try {
		await access.addMembers(groupId, [newMemberId.value]);
		newMemberId.value = null;
		await Promise.all([fetchMembers(), fetchGroup()]);
	}
	catch(error) {
		showError(error);
	}
}

async function removeMember(user: AccessUser) {
	try {
		await access.removeMembers(groupId, [user.id]);
		await Promise.all([fetchMembers(), fetchGroup()]);
	}
	catch(error) {
		showError(error);
	}
}

// ---------- сообщения ----------

function showSuccess(text: string) {
	message.value = { type: 'success', text };
}

function showError(error: unknown) {
	message.value = { type: 'error', text: error instanceof Error ? error.message : 'Ошибка запроса' };
}
</script>

<style lang="scss">
.access-group-page {
	display: flex;
	flex-direction: column;
	gap: 1em;
	color: #172b4d;

	.agc-message {
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

	.agc-sub {
		color: #737373;
		font-size: .9em;
	}

	.agc-status {
		margin-left: .6em;
		padding: .2em .8em;
		border-radius: 999px;
		background: #e7f8ef;
		color: #058039;
		font-size: .75rem;
		font-weight: 600;
		vertical-align: middle;

		&.inactive {
			background: #f1f5f9;
			color: #737373;
		}

		&.blocked {
			background: #f8e7e7;
			color: #d32f2f;
		}
	}

	.agc-head {
		display: flex;
		align-items: center;
		gap: 1em;

		.agc-icon {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 3em;
			height: 3em;
			border-radius: 10px;
			background: #eef4ff;
			color: #114bc8;
		}

		.agc-info {
			flex: auto 1 1;

			.agc-name {
				font-size: 1.5rem;
				font-weight: 700;
			}
		}

		.agc-head-actions {
			display: flex;
			gap: .6em;
		}
	}

	.agc-edit {
		display: flex;
		flex-direction: column;
		gap: 1em;

		.agc-edit-grid {
			display: grid;
			grid-template-columns: 1fr 1fr 2fr;
			gap: 1em;
		}

		.agc-edit-actions {
			display: flex;
			gap: .7em;
		}
	}

	.agc-hint {
		margin-bottom: 1em;
		padding: .7em 1em;
		border-radius: 8px;
		background: #f8fafc;
		color: #525252;
		font-size: .85em;
	}

	.agc-matrix {
		width: 100%;
		border-collapse: collapse;
		font-size: 14px;

		th {
			padding: 10px 12px;
			border-bottom: 1px solid #e5e5e5;
			color: #525252;
			text-align: left;
		}

		td {
			padding: 10px 12px;
			border-bottom: 1px solid #f5f5f5;
			vertical-align: middle;
		}

		tr {
			&.granted {
				.agc-perm-name {
					color: #114bc8;
				}
			}

			&.changed {
				background: #fffbeb;
			}
		}

		.agc-col-perm {
			width: 30%;
		}

		.agc-perm-key {
			color: #a3a3a3;
			font-family: monospace;
			font-size: .85em;
		}

		.agc-levels {
			display: inline-flex;
			border: 1px solid #cbd5e1;
			border-radius: 8px;
			overflow: hidden;

			.agc-level {
				padding: .4em .9em;
				border: none;
				border-right: 1px solid #cbd5e1;
				background: #fff;
				color: #525252;
				font: inherit;
				cursor: pointer;

				&:last-child {
					border-right: none;
				}

				&:hover {
					background: #f1f5f9;
				}

				&.selected {
					background: #2563ea;
					color: #fff;
				}
			}
		}

		.agc-modifiers {
			display: flex;
			gap: 1em;
			flex-wrap: wrap;
		}
	}

	.agc-perm-name {
		font-weight: 600;
	}

	.agc-matrix-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 1em;

		.agc-matrix-actions {
			display: flex;
			gap: .7em;
		}
	}

	.agc-add {
		display: flex;
		align-items: flex-end;
		gap: .7em;
		margin-bottom: 1em;
	}
}
</style>
