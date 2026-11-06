<template>
	<section class="cancel-old-route">
		<BaseBreadcrumbs :breadcrumbs="[{ title: 'Главная', link: '/' }, { title: 'Маршруты' }, { title: 'Отмена старого маршрута' }]"/>
		<h1 class="cor-title">Отмена старого маршрута</h1>
		<BaseIsland title="Отменить маршрут" prependIcon="mdi-map-marker-remove-outline">
			<form class="cor-form" @submit.prevent="cancelRoute">
				<fieldset class="cor-fields" :disabled="isSubmitting">
					<BaseTextBox v-model="form.issueKey" label="Ключ задачи" placeholder="Например, PRV4-97640" :error="errors.issueKey"/>
					<BaseMemo v-model="form.comment" label="Комментарий" placeholder="Укажите причину отмены маршрута" height="140px" resize="vertical" :error="errors.comment"/>
				</fieldset>
				<div v-if="submitSuccess" class="cor-message success" role="status">{{ submitSuccess }}</div>
				<div v-if="submitError" class="cor-message error" role="alert">{{ submitError }}</div>
				<div class="cor-actions">
					<BaseButton prependIcon="mdi-cancel" :disabled="isSubmitting" @click="cancelRoute">{{ isSubmitting ? 'Отмена...' : 'Отменить маршрут' }}</BaseButton>
				</div>
			</form>
		</BaseIsland>
	</section>
</template>

<script lang="ts" setup>
import BaseBreadcrumbs from '~/components/common/base/BaseBreadcrumbs.vue';
import BaseButton from '~/components/common/base/BaseButton.vue';
import BaseIsland from '~/components/common/base/BaseIsland.vue';
import BaseMemo from '~/components/common/base/BaseMemo.vue';
import BaseTextBox from '~/components/common/base/BaseTextBox.vue';

definePageMeta({ layout: 'sidebar' });

const { $fetchTrips } = useNuxtApp();
const form = ref({ issueKey: '', comment: '' });
const errors = ref<Partial<Record<keyof typeof form.value, string>>>({});
const isSubmitting = ref(false);
const submitSuccess = ref('');
const submitError = ref('');

watch(form, () => {
	errors.value = {};
	submitSuccess.value = '';
	submitError.value = '';
}, { deep: true, flush: 'sync' });

async function cancelRoute() {
	if(isSubmitting.value) return;
	submitSuccess.value = '';
	submitError.value = '';
	const body = {} as Record<string, string>;

	const nextErrors: typeof errors.value = {};
	// проверяем ключ задачи
	if(!form.value.issueKey) nextErrors.issueKey = 'Укажите ключ задачи';
	else if(!/^[A-Z][A-Z0-9_]*-[1-9]\d*$/.test(form.value.issueKey)) nextErrors.issueKey = 'Введите ключ в формате PRV4-97640';
	body['issueKey'] = form.value.issueKey.trim().toUpperCase();
	// проверяем комментарий
	if(form.value.comment) body['comment'] = form.value.comment.trim();

	// если есть ошибки, прерываем
	errors.value = nextErrors;
	if(Object.keys(nextErrors).length) return;

	isSubmitting.value = true;
	try {
		const response = await $fetchTrips<{ code?: number, message?: string }>('/trips/cancel/old', {
			method: 'POST',
			body,
		});
		if(response?.code && response.code >= 400) throw new Error(response.message || 'Не удалось отменить маршрут');
		form.value = { issueKey: '', comment: '' };
		submitSuccess.value = `Маршрут по задаче ${body.issueKey} отменён.`;
	} catch (error: any) {
		const message = error?.data?.message ?? error?.message;
		submitError.value = Array.isArray(message) ? message.join('; ') : typeof message === 'string' ? message : 'Не удалось отменить маршрут';
	} finally {
		isSubmitting.value = false;
	}
}
</script>

<style lang="scss">
.cancel-old-route {
	color: #172b4d;
	max-width: 760px;

	.cor-title {
		margin: 1em 0 .6em;
		font-size: 28px;
	}

	.cor-form {
		display: flex;
		flex-direction: column;
		gap: 1.2em;

		.cor-fields {
			display: flex;
			flex-direction: column;
			gap: 1.2em;
			min-width: 0;
			margin: 0;
			padding: 0;
			border: 0;
		}

		.cor-message {
			padding: 1em;
			border-radius: 8px;
			font-size: 14px;
			line-height: 1.6;
			overflow-wrap: anywhere;

			&.success {
				background: #e7f8ef;
				color: #176845;
			}

			&.error {
				background: #f8e7e7;
				color: #c62828;
			}
		}

		.cor-actions {
			display: flex;
			flex-wrap: wrap;
		}
	}
}
</style>
