<template>
	<section class="login-page">
		<div class="auth">
			<form class="form" @keyup.enter="signIn" @submit.prevent="signIn">
				<img height="100" src="/favicon.svg">
				<BaseTextBox v-model="login" label="Логин" prependIcon="mdi-account-outline" placeholder="Введите логин" autofocus/>
				<BaseTextBox v-model="password" label="Пароль" type="password" prependIcon="mdi-lock" placeholder="Введите пароль"/>
				<div v-if="error" style="color:red; text-align:center; font-size:.9em">{{ error }}</div>
				<div style="display:flex; justify-content:space-between; align-items:center; margin-top:.5em;">
					<BaseCheckbox label="Запомнить меня" v-model="rememberMe"/>
				</div>
				<BaseButton @click="signIn" :disabled="isSubmitting" style="line-height:2em; text-align:center;">
					{{ isSubmitting ? 'Проверка...' : 'Войти в систему' }}
				</BaseButton>
			</form>
		</div>
	</section>
</template>

<script lang="ts" setup>
import BaseButton from '~/components/common/base/BaseButton.vue';
import BaseCheckbox from '~/components/common/base/BaseCheckbox.vue';
import BaseTextBox from '~/components/common/base/BaseTextBox.vue';
import { useUserStore } from '~/stores/UserStore';

const login = ref('');
const password = ref('');
const error = ref('');
const rememberMe = ref(false);
const isSubmitting = ref(false);
const userStore = useUserStore();

definePageMeta({
	layout: false,
});

async function signIn() {
	if(isSubmitting.value) return;

	error.value = '';

	if(!login.value.trim() || !password.value) {
		error.value = 'Введите логин и пароль';
		return;
	}

	isSubmitting.value = true;
	const isValid = await userStore.signIn(login.value, password.value, rememberMe.value);
	isSubmitting.value = false;

	if(!isValid) {
		error.value = 'Неверный логин или пароль';
		return;
	}

	await navigateTo('/dashboard');
}
</script>

<style lang="scss">
.login-page {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	min-height: 100vh;

	a {
		text-decoration: none;
		color: #2563ea;
		font-weight:700;
	}
	.island {
		background-color: #fff;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		padding: 20px;
	}
	.auth {
		max-width: 440px;

		.title {
			color:#0d3895;
			font-size: 2em;
			text-align: center;
			margin:0 0 .2em 0;
		}
		.form {
			.logo {
				text-align: center;
			}
			padding:3em 3em 3em 3em;
			display: flex;
			flex-direction: column;
			gap: 1em;
			background-color: #fff;
			border-radius:12px;
			border: 1px solid #e5e5e5;
			// filter: drop-  shadow(0px 0px 4px rgba(0, 0, 0, 0.1));
		}
	}
}
</style>
