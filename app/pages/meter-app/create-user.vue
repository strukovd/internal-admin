<template>
	<section class="meter-app-upload">
		<BaseBreadcrumbs :breadcrumbs="[{ title: 'Главная', link: '/' }, { title: 'Массовая замена' }]"/>
		<BaseIsland title="Создание пользователя" prependIcon="mdi-account-plus">
			<form class="meter-app-upload-form" @submit.prevent="sendForm">
				<BaseTextBox v-model="form.login" label="Логин" :error="errors.login"/>
				<BaseTextBox v-model="form.fullName" label="Имя" :error="errors.fullName"/>
				<BaseTextBox v-model="form.position" label="Должность" :error="errors.position"/>
				<BaseAutocomplete v-model="form.officeId" label="Офис" :error="errors.officeId" :items="normalizeStreetOptions"/>
				<BaseAutocomplete v-model="form.role" label="Роль" disabled :error="errors.role" autoselect :items="[{ key: 'CONTROLER', value: 'Контролёр' }]"/>
				<BaseTextBox v-model="form.contactNumber" label="Контактный номер (необязательно)" :error="errors.contactNumber"/>
				<BaseTextBox v-model="form.email" label="Email (необязательно)" :error="errors.email"/>
				<BaseTextBox v-model="form.passCode" label="Пин-код (необязательно)" :error="errors.passCode"/>

				<div v-if="submitError" style="align-items:center; background:#f8e7e7; border-radius:8px; color:#d32f2f; display:flex; font-size:13px; gap:8px; padding:10px 12px;">
					<BaseIcon name="mdi-alert-circle" size="1.2em"/>
					<span>{{ submitError }}</span>
				</div>
				<div v-if="submitSuccess" style="align-items:center; background:#e7f8ef; border-radius:8px; color:#058039; display:flex; font-size:13px; gap:8px; padding:10px 12px;">
					<BaseIcon name="mdi-check-circle" size="1.2em"/>
					<span>{{ submitSuccess }}</span>
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
type Form = {
	login: string,
	passCode: string,
	fullName: string,
	position: string,
	officeId: number | null,
	contactNumber: string,
	email: string,
	role: 'CONTROLER' | null
}

const { $meterApi } = useNuxtApp();

const form = ref<Form>({
	login: '',
	passCode: '',
	fullName: '',
	position: '',
	officeId: null,
	contactNumber: '',
	email: '',
	role: null
});

const errors = ref<Partial<Record<keyof Form, string>>>({});
const isSubmitting = ref(false);
const submitError = ref('');
const submitSuccess = ref('');
const uploadEndpoint = '/meter-app/users';
const streets = ref<Record<string, string>>({
	"1":	"г.Кара-Балта, ул.Садовая,112",
	"2":	"с.Ленинское, ул.Алма-Атинская,248",
	"3":	"с. Аманбаево – ул. Толстунова, 8",
	"4":	"г. Ош – ул. Ленина, 146",
	"5":	"г. Джалал-Абад – ул. Ленина, 2",
	"6":	"г. Кадамжай – ул. Металлургов, 8а/2",
	"7":	"г. Кызыл-Кия – ул. Киргизская, 273",
	"8":	"г. Айдаркен – ул. Миклухо-Маклая, 14 кв.39",
	"9":	"г. Шопоков, ул. Ленина, 11",
	"10":	"ул. М. Горького, 22",
	"11":	"ул.Ю.Фучика, 19",
	"12":	"г.Токмок,ул. Горького, 1, проезд 17",
	"13":	"г. Кара-Суу – ул. Ленина, 14 кв.2",
	"14":	"Майлы-Суу – ул. Коммунистическая, б/н",
	"15":	"ул.И. Ахунбаева,186/1",
	"16":	"Жибек-Жолу, 150",
	"17":	"Токтогула, 45",
	"18":	"Чуй 230",
	"19":	"г.Кант, ул.Маликова,6",
});

const normalizeStreetOptions = computed(() => {
	return Object.entries(streets.value).map(([key, value]) => ({
		key,
		value
	}));
});

definePageMeta({
	// auth: true,
	// roles: ['ADMIN', 'MANAGER'],
	layout: 'sidebar'
});

function validateForm() {
	const nextErrors: Partial<Record<keyof Form, string>> = {};

	if( !form.value.login ) nextErrors.login = 'Укажите логин';
	else if( form.value.passCode && !/^\d{4}$/.test(form.value.passCode) ) nextErrors.passCode = 'Пароль должен состоять из 4 цифр';
	if( !form.value.fullName ) nextErrors.fullName = 'Укажите полное имя';
	if( !form.value.position ) nextErrors.position = 'Укажите должность';
	if( !form.value.role ) nextErrors.role = 'Укажите роль';

	errors.value = nextErrors;
	return Object.keys(nextErrors).length === 0;
}

const resetForm = () => {
	form.value = {
		login: '',
		passCode: '',
		fullName: '',
		position: '',
		officeId: null,
		contactNumber: '',
		email: '',
		role: null
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
		const res: any = await $meterApi(uploadEndpoint, {
			method: 'POST',
			body: JSON.stringify({
				...form.value,
				officeId: form.value.officeId ? Number(form.value.officeId) : null
			})
		});

		const { id, login, passCode } = res.result;
		resetForm();
		submitSuccess.value = 'Пользователь создан! Логин: ' + login + (passCode ? ', пин-код: <strong>' + passCode : '</strong>') + ' (ID: ' + id + ')';
	} catch (error: any) {
		submitError.value = error?.data?.message ?? error?.message ?? 'Не удалось создать пользователя';
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
