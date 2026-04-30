<template>
	<section class="meter-app-upload">
		<BaseBreadcrumbs :breadcrumbs="[{ title: 'Главная', link: '/' }, { title: 'Массовая замена' }]"/>
		<BaseIsland title="Добавление лицевых счетов для массовой замены через Excel-файл." prependIcon="mdi-upload">
			<form class="meter-app-upload-form" @submit.prevent="sendForm">
				<BaseFilePicker v-model="form.file" label="Поместите excel-файл сюда" accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" :error="errors.file"/>
				<BaseTextBox v-model="form.worksheet" label="Название листа (необязательно)" placeholder="Лист1" :error="errors.worksheet"/>
				<p v-if="submitError" class="submit-message error">{{ submitError }}</p>
				<p v-if="submitSuccess" class="submit-message success">{{ submitSuccess }}</p>
				<BaseButton @click="sendForm" :disabled="isSubmitting" prependIcon="mdi-send">{{ isSubmitting ? 'Загрузка...' : 'Загрузить' }}</BaseButton>
			</form>
		</BaseIsland>
	</section>
</template>

<script lang="ts" setup>
import BaseBreadcrumbs from '~/components/common/base/BaseBreadcrumbs.vue';
import BaseButton from '~/components/common/base/BaseButton.vue';
import BaseFilePicker from '~/components/common/base/BaseFilePicker.vue';
import BaseIsland from '~/components/common/base/BaseIsland.vue';
import BaseTextBox from '~/components/common/base/BaseTextBox.vue';
type Form = {
	file: File | null,
	worksheet: string
}

const { $api } = useNuxtApp();

const form = ref<Form>({
	file: null,
	worksheet: ''
});

const errors = ref<Partial<Record<keyof Form, string>>>({});
const isSubmitting = ref(false);
const submitError = ref('');
const submitSuccess = ref('');
const uploadEndpoint = '/meter-app/file';

definePageMeta({
	// auth: true,
	// roles: ['ADMIN', 'MANAGER'],
	layout: 'sidebar'
});

function validateForm() {
	const nextErrors: Partial<Record<keyof Form, string>> = {};

	if( !form.value.file ) nextErrors.file = 'Выберите файл';
	// if( !form.value.worksheet.trim() ) nextErrors.worksheet = 'Укажите название листа';

	errors.value = nextErrors;
	return Object.keys(nextErrors).length === 0;
}

async function sendForm() {
	if( isSubmitting.value ) return;

	submitError.value = '';
	submitSuccess.value = '';

	if( !validateForm() ) return;

	const body = new FormData();
	body.append('file', form.value.file as File);
	if( form.value?.worksheet.trim() ) body.append('worksheet', form.value.worksheet.trim());

	try {
		isSubmitting.value = true;
		await $api(uploadEndpoint, {
			method: 'POST',
			body
		});

		submitSuccess.value = 'Файл отправлен';
	} catch (error: any) {
		submitError.value = error?.data?.message ?? error?.message ?? 'Не удалось загрузить файл';
	} finally {
		isSubmitting.value = false;
	}
}
</script>

<style lang="scss">
.meter-app-upload {
	.meter-app-upload-form {
		display: flex;
		flex-direction: column;
		gap: 1em;
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
