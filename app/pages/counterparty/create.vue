<template>
	<section class="counterparty-create">
		<BaseBreadcrumbs :breadcrumbs="[{ title: 'Главная', link: '/' }, { title: 'Массовая замена' }]"/>
		<BaseIsland class="counterparty-create-island" title="Создание пользователя" prependIcon="mdi-account-plus">
			<form class="counterparty-create-form" @submit.prevent="sendForm">
				<BaseTextBox v-model="form.account" label="Лицевой счет" :error="errors.account"/>
				<BaseTextBox v-model="form.name" label="Имя" :error="errors.name"/>
				<BaseTextBox v-model="form.address" label="Адрес" :error="errors.address"/>
				<BaseTextBox v-model="form.inn" label="ИНН" :error="errors.inn"/>

				<div v-if="submitError" style="align-items:center; background:#f8e7e7; border-radius:8px; color:#d32f2f; display:flex; font-size:13px; gap:8px; padding:10px 12px;">
					<BaseIcon name="mdi-alert-circle" size="1.2em"/>
					<span v-html="submitError"></span>
				</div>
				<div v-if="submitSuccess" style="align-items:center; background:#e7f8ef; border-radius:8px; color:#058039; display:flex; font-size:13px; gap:8px; padding:10px 12px;">
					<BaseIcon name="mdi-check-circle" size="1.2em"/>
					<span v-html="submitSuccess"></span>
				</div>
				<BaseButton @click="sendForm" :disabled="isSubmitting" prependIcon="mdi-send">{{ isSubmitting ? 'Загрузка...' : 'Отправить' }}</BaseButton>
			</form>
		</BaseIsland>
	</section>
</template>

<script lang="ts" setup>
import BaseAutocomplete from '~/components/common/base/BaseAutocomplete.vue';
import BaseBreadcrumbs from '~/components/common/base/BaseBreadcrumbs.vue';
import BaseButton from '~/components/common/base/BaseButton.vue';
import BaseIcon from '~/components/common/base/BaseIcon.vue';
import BaseIsland from '~/components/common/base/BaseIsland.vue';
import BaseTextBox from '~/components/common/base/BaseTextBox.vue';
const { $fetchFacility } = useNuxtApp();
definePageMeta({
	// auth: true,
	// roles: ['ADMIN', 'MANAGER'],
	layout: 'sidebar'
});
type Form = {
	account?: string,
	name: string,
	address: string,
	inn: string
}


const form = ref<Form>({
	account: '',
	name: '',
	address: '',
	inn: ''
});

const errors = ref<Partial<Record<keyof Form, string>>>({});
const isSubmitting = ref(false);
const submitError = ref('');
const submitSuccess = ref('');
const uploadEndpoint = '/counterparty';

function validateForm() {
	const nextErrors: Partial<Record<keyof Form, string>> = {};

	if( !form.value.account ) nextErrors.account = 'Укажите лицевой счет';
	if( !form.value.name ) nextErrors.name = 'Укажите имя';
	if( !form.value.address ) nextErrors.address = 'Укажите адрес';

	errors.value = nextErrors;
	return Object.keys(nextErrors).length === 0;
}

const resetForm = () => {
	form.value = {
		account: '',
		name: '',
		address: '',
		inn: ''
	};
	errors.value = {};
	submitError.value = '';
	submitSuccess.value = '';
};

async function sendForm() {
	if( isSubmitting.value ) return;

	submitError.value = '';
	submitSuccess.value = '';

	if( !validateForm() ) return;

	try {
		isSubmitting.value = true;
		const res: any = await $fetchFacility(uploadEndpoint, {
			method: 'POST',
			body: JSON.stringify(form.value)
		});

		const { id, login, passCode } = res.result;
		resetForm();

		submitSuccess.value = `Контрагент создан!`;
	} catch (error: any) {
		submitError.value = error?.data?.message ?? error?.message ?? 'Не удалось создать контрагента';
	} finally {
		isSubmitting.value = false;
	}
}
</script>

<style lang="scss">
.counterparty-create {
	
	.counterparty-create-island {
		max-width: 700px;
		/* margin:2em auto; */

		.counterparty-create-form {
			display: flex;
			flex-direction: column;
			gap: 1em;
		}
	}

	.submit-message {
		margin: 0;
		font-size: .9rem;

		&.error {
			color: #dc2626;
		}

		&.success {
			color: #15803d;
		}
	}
}
</style>
