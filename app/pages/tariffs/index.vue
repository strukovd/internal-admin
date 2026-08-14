<template>
	<section class="tariffs-page">
		<BaseBreadcrumbs :breadcrumbs="[{ title: 'Главная', link: '/' }, { title: 'Тарифы' }]"/>

		<div class="tariffs-page__header">
			<div>
				<h1>Тарифы</h1>
			</div>
			<div class="tariffs-page__header-actions">
				<BaseButton variant="secondary" prependIcon="mdi-refresh" :disabled="isLoading" @click="fetchTariffs">Обновить</BaseButton>
				<BaseButton :prependIcon="isFormVisible ? 'mdi-close' : 'mdi-plus'" @click="toggleForm">{{ isFormVisible ? 'Закрыть' : 'Добавить тариф' }}</BaseButton>
			</div>
		</div>

		<BaseIsland v-if="isFormVisible" :title="formTitle" prependIcon="mdi-cash-plus">
			<form class="tariff-form" @submit.prevent="submitTariff">
				<div class="tariff-form__grid">
					<BaseTextBox v-model="form.value" type="number" label="Значение" :error="errors.value"/>
					<BaseAutocomplete v-model="form.type" label="Тип" :error="errors.type" :items="typeOptions"/>
					<BaseTextBox v-model="form.date" type="date" label="Дата начала" :error="errors.date"/>
					<BaseAutocomplete v-model="form.officeId" label="Офис" :error="errors.officeId" :items="officeOptions"/>
					<BaseTextBox v-model="form.nds" type="number" label="НДС" :error="errors.nds"/>
					<BaseTextBox v-model="form.nsp" type="number" label="НСП" :error="errors.nsp"/>
				</div>

				<div v-if="submitSuccess" class="tariff-message tariff-message--success">
					<BaseIcon name="mdi-check-circle" size="1.2em"/>
					<span>{{ submitSuccess }}</span>
				</div>
				<div v-if="submitError" class="tariff-message tariff-message--error">
					<BaseIcon name="mdi-alert-circle" size="1.2em"/>
					<span>{{ submitError }}</span>
				</div>

				<div class="tariff-form__actions">
					<BaseButton prependIcon="mdi-content-save" :disabled="isSubmitting" @click="submitTariff">{{ submitButtonText }}</BaseButton>
					<BaseButton variant="secondary" prependIcon="mdi-refresh" @click="resetForm">Сбросить</BaseButton>
				</div>
			</form>
		</BaseIsland>

		<BaseIsland title="Список тарифов" prependIcon="mdi-table">
			<div class="tariff-filters">
				<BaseAutocomplete label="Тип" v-model="filters.type" :items="typeOptions" placeholder="Все" @change="applyFilters"/>
				<BaseAutocomplete label="Сортировка" v-model="filters.sortOrder" :items="[{ key: 'DESC', value: 'Сначала новые' }, { key: 'ASC', value: 'Сначала старые' }]" placeholder="Все" @change="applyFilters"/>
				<BaseAutocomplete label="Лимит" v-model.number="limit" :items="[{ key: 10, value: '10' }, { key: 25, value: '25' }, { key: 50, value: '50' }, { key: 100, value: '100' }]" placeholder="Все" @change="applyFilters"/>
			</div>

			<div v-if="loadError" class="tariff-message tariff-message--error tariff-message--spaced">
				<BaseIcon name="mdi-alert-circle" size="1.2em"/>
				<span>{{ loadError }}</span>
			</div>

			<BaseTable
				:key="`tariffs-page-${page}`"
				:columns="columns"
				:rows="tableRows"
				:loading="isLoading"
				rowKey="id"
				pageable
				:page="page"
				:limit="limit"
				:total="total"
				@page:change="changePage"
			>
				<template #cell.date="{ value }">
					<span class="tariff-date">{{ formatDate(value) }}</span>
				</template>

				<template #cell.created="{ value }">
					<span class="tariff-date">{{ formatDateTime(value) }}</span>
				</template>

				<template #cell.type="{ value }">
					<span class="tariff-type">{{ getTypeLabel(String(value)) }}</span>
				</template>

				<template #cell.value="{ value }">
					<span class="tariff-value">{{ formatNumber(value) }}</span>
				</template>

				<template #cell.actions="{ row }">
					<div class="tariff-actions">
						<BaseButton variant="light" prependIcon="mdi-pencil" @click.stop="editTariff(row)">
							Изменить
						</BaseButton>
						<BaseButton variant="light" prependIcon="mdi-content-copy" @click.stop="copyTariff(row)">
							Копия
						</BaseButton>
						<BaseButton
							variant="secondary"
							prependIcon="mdi-delete-outline"
							:disabled="deletingTariffId === Number(row.id)"
							@click.stop="deleteTariff(row)"
						>
							{{ deletingTariffId === Number(row.id) ? 'Удаление...' : 'Удалить' }}
						</BaseButton>
					</div>
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

const { $fetchFacility } = useNuxtApp();

definePageMeta({
	layout: 'sidebar'
});

type TariffType = 'FL' | 'UL';

type TariffForm = {
	value: number | string,
	type: TariffType | '',
	date: string,
	officeId: number | string | null,
	nds: number | string,
	nsp: number | string,
};

type TariffRow = {
	id: number,
	value: number,
	type: TariffType,
	date: string | null,
	created: string,
	officeId?: number,
	nds?: number,
	nsp?: number,
};

type TariffListResponse = {
	result?: {
		data?: TariffRow[],
		total?: number,
		page?: number,
		limit?: number,
		totalPages?: number,
	},
	code?: number,
};

const columns = [
	{ key: 'id', label: 'ID', width: '80px' },
	{ key: 'date', label: 'Дата', width: '130px' },
	{ key: 'type', label: 'Тип', width: '120px' },
	{ key: 'value', label: 'Тариф', width: '120px' },
	{ key: 'created', label: 'Создан', width: '180px' },
	{ key: 'actions', label: '', width: '300px', cellClass: 'tariffs-page__actions-cell' },
];

const typeOptions = [
	{ key: 'FL', value: 'Физ. лицо' },
	{ key: 'UL', value: 'Юр. лицо' },
];

const offices: Record<number, string> = {
	1: 'г.Кара-Балта, ул.Садовая,112',
	2: 'с.Ленинское, ул.Алма-Атинская,248',
	3: 'с. Аманбаево - ул. Толстунова, 8',
	4: 'г. Ош - ул. Ленина, 146',
	5: 'г. Джалал-Абад - ул. Ленина, 2',
	14: 'Майлы-Суу - ул. Коммунистическая, б/н',
	15: 'ул.И. Ахунбаева,186/1',
	16: 'Жибек-Жолу, 150',
	19: 'г.Кант, ул.Маликова,6',
};

const officeOptions = computed(() => Object.entries(offices).map(([key, value]) => ({
	key,
	value
})));

const isFormVisible = ref(false);
const isLoading = ref(false);
const isSubmitting = ref(false);
const loadError = ref('');
const submitError = ref('');
const submitSuccess = ref('');
const editingTariffId = ref<number | null>(null);
const deletingTariffId = ref<number | null>(null);
const page = ref(1);
const limit = ref(10);
const total = ref(0);
const filters = ref<{
	type: TariffType | '',
	sortOrder: 'ASC' | 'DESC',
}>({
	type: '',
	sortOrder: 'DESC',
});
const errors = ref<Partial<Record<keyof TariffForm, string>>>({});
const form = ref<TariffForm>(getInitialForm());
const tariffs = ref<TariffRow[]>([]);

const tableRows = computed(() => tariffs.value);
const formTitle = computed(() => editingTariffId.value ? `Редактирование тарифа #${editingTariffId.value}` : 'Добавление тарифа');
const submitButtonText = computed(() => {
	if(isSubmitting.value) return editingTariffId.value ? 'Обновление...' : 'Сохранение...';
	return editingTariffId.value ? 'Обновить' : 'Сохранить';
});

onMounted(() => {
	fetchTariffs();
});

function getInitialForm(): TariffForm {
	return {
		value: 0,
		type: 'FL',
		date: '2026-06-01',
		officeId: 14,
		nds: 2,
		nsp: 14,
	};
}

function toggleForm() {
	if(!isFormVisible.value) resetForm(false);
	isFormVisible.value = !isFormVisible.value;
	submitSuccess.value = '';
	submitError.value = '';
}

function validateForm() {
	const nextErrors: Partial<Record<keyof TariffForm, string>> = {};

	if(form.value.value === '' || Number(form.value.value) < 0) nextErrors.value = 'Укажите значение';
	if(!form.value.type) nextErrors.type = 'Выберите тип';
	if(!form.value.date) nextErrors.date = 'Укажите дату';
	if(!form.value.officeId) nextErrors.officeId = 'Выберите офис';
	if(form.value.nds === '' || Number(form.value.nds) < 0) nextErrors.nds = 'Укажите НДС';
	if(form.value.nsp === '' || Number(form.value.nsp) < 0) nextErrors.nsp = 'Укажите НСП';

	errors.value = nextErrors;
	return Object.keys(nextErrors).length === 0;
}

function normalizeForm() {
	return {
		value: Number(form.value.value),
		type: form.value.type as TariffType,
		date: form.value.date,
		officeId: Number(form.value.officeId),
		nds: Number(form.value.nds),
		nsp: Number(form.value.nsp),
	};
}

async function fetchTariffs() {
	if(isLoading.value) return;

	try {
		isLoading.value = true;
		loadError.value = '';
		const query: Record<string, string | number> = {
			page: page.value,
			limit: limit.value,
			sortOrder: filters.value.sortOrder,
		};
		if(filters.value.type) query.type = filters.value.type;

		const response = await $fetchFacility('/tariff', {
			method: 'GET',
			query,
		}) as TariffListResponse;

		tariffs.value = response.result?.data ?? [];
		total.value = response.result?.total ?? tariffs.value.length;
		page.value = response.result?.page ?? page.value;
		limit.value = response.result?.limit ?? limit.value;
	} catch (error: any) {
		tariffs.value = [];
		total.value = 0;
		loadError.value = error?.data?.message ?? error?.message ?? 'Не удалось загрузить тарифы';
	} finally {
		isLoading.value = false;
	}
}

function changePage(nextPage: number) {
	page.value = nextPage;
	fetchTariffs();
}

function applyFilters() {
	page.value = 1;
	fetchTariffs();
}

async function submitTariff() {
	if(isSubmitting.value) return;

	submitSuccess.value = '';
	submitError.value = '';
	if(!validateForm()) return;

	try {
		isSubmitting.value = true;
		await $fetchFacility(editingTariffId.value ? `/tariff/${editingTariffId.value}` : '/tariff', {
			method: editingTariffId.value ? 'PUT' : 'POST',
			body: JSON.stringify(normalizeForm()),
		});

		submitSuccess.value = editingTariffId.value ? 'Тариф обновлен' : 'Тариф добавлен';
		resetForm(false);
		page.value = 1;
		await fetchTariffs();
	} catch (error: any) {
		submitError.value = error?.data?.message ?? error?.message ?? (editingTariffId.value ? 'Не удалось обновить тариф' : 'Не удалось добавить тариф');
	} finally {
		isSubmitting.value = false;
	}
}

function resetForm(clearMessage = true) {
	form.value = getInitialForm();
	editingTariffId.value = null;
	errors.value = {};
	if(clearMessage) {
		submitSuccess.value = '';
		submitError.value = '';
	}
}

function fillFormFromTariff(source: TariffRow) {
	const initialForm = getInitialForm();
	form.value = {
		value: source.value,
		type: source.type,
		date: normalizeInputDate(source.date) ?? initialForm.date,
		officeId: source.officeId ?? initialForm.officeId,
		nds: source.nds ?? initialForm.nds,
		nsp: source.nsp ?? initialForm.nsp,
	};
}

function editTariff(row: Record<string, unknown>) {
	const source = tariffs.value.find(tariff => tariff.id === Number(row.id));
	if(!source) return;

	fillFormFromTariff(source);
	editingTariffId.value = source.id;
	isFormVisible.value = true;
	submitSuccess.value = '';
	submitError.value = '';
}

function copyTariff(row: Record<string, unknown>) {
	const source = tariffs.value.find(tariff => tariff.id === Number(row.id));
	if(!source) return;

	fillFormFromTariff(source);
	editingTariffId.value = null;
	isFormVisible.value = true;
	submitSuccess.value = '';
	submitError.value = '';
}

async function deleteTariff(row: Record<string, unknown>) {
	const tariffId = Number(row.id);
	if(!tariffId || deletingTariffId.value) return;
	if(!window.confirm(`Удалить тариф #${tariffId}?`)) return;

	try {
		deletingTariffId.value = tariffId;
		loadError.value = '';
		await $fetchFacility(`/tariff/${tariffId}`, {
			method: 'DELETE',
		});

		if(tariffs.value.length === 1 && page.value > 1) page.value -= 1;
		await fetchTariffs();
	} catch (error: any) {
		loadError.value = error?.data?.message ?? error?.message ?? 'Не удалось удалить тариф';
	} finally {
		deletingTariffId.value = null;
	}
}

function getTypeLabel(type: string) {
	return typeOptions.find(item => item.key === type)?.value ?? type;
}

function formatNumber(value: unknown) {
	const numberValue = Number(value);
	if(Number.isNaN(numberValue)) return '-';

	return numberValue.toLocaleString('ru-RU', {
		maximumFractionDigits: 5
	});
}

function formatDate(value: unknown) {
	if(!value) return '-';

	const date = new Date(String(value));
	if(Number.isNaN(date.getTime())) return String(value);

	return date.toLocaleDateString('ru-RU');
}

function normalizeInputDate(value: unknown) {
	if(!value) return null;

	const stringValue = String(value);
	if(/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) return stringValue;

	const date = new Date(stringValue);
	if(Number.isNaN(date.getTime())) return null;

	return date.toISOString().slice(0, 10);
}

function formatDateTime(value: unknown) {
	if(!value) return '-';

	const date = new Date(String(value));
	if(Number.isNaN(date.getTime())) return String(value);

	return date.toLocaleString('ru-RU', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}
</script>

<style lang="scss">
.tariffs-page {
	color: #172b4d;

	&__header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1em;
		margin-top: .8em;

		h1 {
			margin: 0;
			font-size: 28px;
			line-height: 1.2em;
		}

		p {
			margin: .35em 0 0;
			color: #737373;
			font-size: .95rem;
		}
	}

	&__actions-cell {
		text-align: right;
	}

	&__header-actions {
		display: flex;
		align-items: center;
		gap: .7em;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.tariff-form {
		display: flex;
		flex-direction: column;
		gap: 1em;

		&__grid {
			display: grid;
			grid-template-columns: repeat(3, minmax(180px, 1fr));
			gap: 1em;
		}

		&__actions {
			display: flex;
			align-items: center;
			gap: .7em;
			flex-wrap: wrap;
		}
	}

	.tariff-message {
		align-items: center;
		border-radius: 8px;
		display: flex;
		font-size: 13px;
		gap: 8px;
		padding: 10px 12px;

		&--success {
			background: #e7f8ef;
			color: #058039;
		}

		&--error {
			background: #f8e7e7;
			color: #d32f2f;
		}

		&--spaced {
			margin-bottom: 1em;
		}
	}

	.tariff-filters {
		display: flex;
		align-items: flex-end;
		gap: 1em;
		flex-wrap: wrap;
		margin-bottom: 1em;
	}

	.tariff-type {
		display: inline-flex;
		align-items: center;
		min-width: 86px;
		border-radius: 999px;
		background: #eef4ff;
		color: #114bc8;
		font-weight: 700;
		justify-content: center;
		padding: .3em .65em;
	}

	.tariff-value {
		font-weight: 700;
		color: #171717;
	}

	.tariff-actions {
		display: flex;
		justify-content: flex-end;
		gap: .5em;
	}
}

@media (max-width: 900px) {
	.tariffs-page {
		&__header {
			align-items: stretch;
			flex-direction: column;
		}

		&__header-actions {
			justify-content: flex-start;
		}

		.tariff-form__grid {
			grid-template-columns: 1fr;
		}

		.tariff-actions {
			justify-content: flex-start;
		}

		.tariff-filter {
			flex: auto 1 1;
		}
	}
}
</style>
