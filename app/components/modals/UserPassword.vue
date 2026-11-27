<template>
	<form class="user-password-modal" @submit.prevent="save">
		<div v-if="error" class="upm-error">{{ error }}</div>

		<BaseTextBox v-model="password" type="password" label="Новый пароль" :error="passwordError" autofocus/>

		<footer class="upm-footer">
			<BaseButton prependIcon="mdi-lock-reset" :disabled="loading" @click="save">Сменить пароль</BaseButton>
			<BaseButton variant="secondary" prependIcon="mdi-close" :disabled="loading" @click="close(false)">Отмена</BaseButton>
		</footer>
	</form>
</template>

<script lang="ts" setup>
import BaseButton from '~/components/common/base/BaseButton.vue';
import BaseTextBox from '~/components/common/base/BaseTextBox.vue';
import { useAccessStore, type AccessUser } from '~/stores/AccessStore';

/** Сброс пароля пользователя администратором. Закрывается с true после успешной смены */
const props = defineProps<{
	payload: { user: AccessUser };
}>();

const access = useAccessStore();
const password = ref('');
const passwordError = ref('');
const error = ref('');
const loading = ref(false);

async function save() {
	if(loading.value) return; // BaseButton disabled только красит кнопку, клик всё равно приходит
	passwordError.value = password.value ? '' : 'Введите пароль';
	if(passwordError.value) return;

	loading.value = true;
	error.value = '';
	try {
		await access.setUserPassword(props.payload.user.id, password.value);
		close(true);
	}
	catch(e) {
		error.value = e instanceof Error ? e.message : 'Ошибка запроса';
	}
	finally {
		loading.value = false;
	}
}

function close(result: boolean) {
	useAppStore().modals.pop()?.resolve?.(result);
}
</script>

<style lang="scss">
.user-password-modal {
	display: flex;
	flex-direction: column;
	gap: 1em;

	.upm-error {
		padding: 10px 12px;
		border-radius: 8px;
		background: #f8e7e7;
		color: #d32f2f;
		font-size: 13px;
	}

	.upm-footer {
		display: flex;
		justify-content: flex-end;
		gap: .7em;
	}
}
</style>
