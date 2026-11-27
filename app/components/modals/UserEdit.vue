<template>
	<form class="user-edit-modal" @submit.prevent="save">
		<div v-if="error" class="uem-error">{{ error }}</div>

		<AvatarPicker v-model="form.avatar" :name="form.name" label="Фото" @file="avatarFile = $event"/>

		<div class="uem-grid">
			<BaseTextBox v-model="form.username" label="Логин" :error="errors.username" autofocus/>
			<BaseTextBox v-model="form.name" label="Имя" :error="errors.name"/>
			<BaseTextBox v-model="form.position" label="Должность"/>
			<UserPicker v-model="form.parentId" label="Руководитель" placeholder="Не назначен" :excludeIds="user ? [user.id] : []"/>
			<!-- <BaseAutocomplete v-model="form.defaultLang" label="Язык интерфейса" :items="[{ key: `ru`, value: `Русский` }]"/> -->
			<BaseTextBox v-if="!isEdit" v-model="form.password" type="password" label="Пароль" placeholder="Не обязательно"/>
		</div>

		<footer class="uem-footer">
			<BaseButton prependIcon="mdi-content-save" :disabled="loading" @click="save">{{ isEdit ? 'Сохранить' : 'Создать' }}</BaseButton>
			<BaseButton variant="secondary" prependIcon="mdi-close" :disabled="loading" @click="close(null)">Отмена</BaseButton>
		</footer>
	</form>
</template>

<script lang="ts" setup>
import BaseButton from '~/components/common/base/BaseButton.vue';
import BaseTextBox from '~/components/common/base/BaseTextBox.vue';
import AvatarPicker from '~/components/AvatarPicker.vue';
import UserPicker from '~/components/UserPicker.vue';
import { useAccessStore, type AccessUser } from '~/stores/AccessStore';
import BaseAutocomplete from '../common/base/BaseAutocomplete.vue';

/**
 * Создание (payload.user не передан) и редактирование пользователя.
 * Сохраняет сама и закрывается с результатом; при ошибке остаётся открытой и показывает её.
 */
export type UserEditResult = { action: 'created' | 'updated'; user: AccessUser; generatedPassword?: string } | null;

const props = defineProps<{
	payload?: { user?: AccessUser };
}>();

const access = useAccessStore();
const user = props.payload?.user;
const isEdit = Boolean(user);

const form = reactive({
	username: user?.username ?? '',
	name: user?.name ?? '',
	position: user?.position ?? '',
	parentId: user?.parentId ?? null,
	avatar: user?.avatar ?? null,
	defaultLang: 'ru', // TODO: в AccessUser пока нет defaultLang, в dto не отправляется
	password: '',
});
const errors = reactive<Record<string, string>>({});
const error = ref('');
const loading = ref(false);
/** Новый файл аватара: загружается при сохранении, чтобы «Отмена» не оставляла мусор в хранилище */
const avatarFile = ref<File | null>(null);

async function save() {
	if(loading.value) return; // BaseButton disabled только красит кнопку, клик всё равно приходит
	errors.username = form.username.trim() ? '' : 'Обязательное поле';
	errors.name = form.name.trim() ? '' : 'Обязательное поле';
	if(errors.username || errors.name) return;

	loading.value = true;
	error.value = '';
	try {
		const avatar = avatarFile.value ? await access.uploadAvatar(avatarFile.value) : form.avatar;
		const dto = { username: form.username.trim(), name: form.name.trim(), position: form.position.trim() || null, parentId: form.parentId, avatar };
		if(user) {
			close({ action: 'updated', user: await access.updateUser(user.id, dto) });
		}
		else {
			const { generatedPassword, ...created } = await access.createUser({ ...dto, password: form.password || undefined });
			close({ action: 'created', user: created, generatedPassword });
		}
	}
	catch(e) {
		error.value = e instanceof Error ? e.message : 'Ошибка запроса';
	}
	finally {
		loading.value = false;
	}
}

function close(result: UserEditResult) {
	useAppStore().modals.pop()?.resolve?.(result);
}
</script>

<style lang="scss">
.user-edit-modal {
	display: flex;
	flex-direction: column;
	gap: 1em;

	.uem-error {
		padding: 10px 12px;
		border-radius: 8px;
		background: #f8e7e7;
		color: #d32f2f;
		font-size: 13px;
	}

	.uem-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(200px, 1fr));
		gap: 1em;
	}

	.uem-footer {
		display: flex;
		justify-content: flex-end;
		gap: .7em;
	}
}
</style>
