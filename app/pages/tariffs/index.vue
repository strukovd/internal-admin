<template>
	<section class="tariffs-page">
		<BaseBreadcrumbs :breadcrumbs="[{ title: 'Главная', link: '/' }, { title: 'Тарифы' }]"/>

		<div class="tp-header">
			<div>
				<h1 class="tp-title">Тарифы</h1>
			</div>
			<div class="tp-header-actions">
				<BaseButton variant="secondary" prependIcon="mdi-refresh" :disabled="isLoading" @click="fetchTariffs">Обновить</BaseButton>
				<BaseButton :prependIcon="isFormVisible ? 'mdi-close' : 'mdi-plus'" @click="toggleForm">{{ isFormVisible ? 'Закрыть' : 'Добавить тариф' }}</BaseButton>
			</div>
		</div>

		<BaseIsland v-if="isFormVisible" :title="formTitle" prependIcon="mdi-cash-plus">
			<form class="tp-form" @submit.prevent="submitTariff">
				<div class="tp-form-grid">
					<BaseTextBox v-model="form.value" type="number" label="Значение" :error="errors.value"/>
					<BaseAutocomplete v-model="form.type" label="Тип" :error="errors.type" :items="typeOptions"/>
					<BaseTextBox v-model="form.date" type="date" label="Дата начала" :error="errors.date"/>
					<BaseAutocomplete v-model="form.officeId" label="Офис" :error="errors.officeId" :items="officeOptions"/>
					<BaseTextBox v-model="form.nds" type="number" label="НДС" :error="errors.nds"/>
					<BaseTextBox v-model="form.nsp" type="number" label="НСП" :error="errors.nsp"/>
				</div>

				<div v-if="submitSuccess" class="tp-message success">
					<BaseIcon name="mdi-check-circle" size="1.2em"/>
					<span>{{ submitSuccess }}</span>
				</div>
				<div v-if="submitError" class="tp-message error">
					<BaseIcon name="mdi-alert-circle" size="1.2em"/>
					<span>{{ submitError }}</span>
				</div>

				<div class="tp-form-actions">
					<BaseButton prependIcon="mdi-content-save" :disabled="isSubmitting" @click="submitTariff">{{ submitButtonText }}</BaseButton>
					<BaseButton variant="secondary" prependIcon="mdi-refresh" @click="resetForm">Сбросить</BaseButton>
				</div>
			</form>
		</BaseIsland>

		<BaseIsland title="Список тарифов" prependIcon="mdi-table">
			<div class="tp-filters">
				<BaseAutocomplete label="Тип" autoselect v-model="filters.type" :items="typeOptions" placeholder="Все" @change="applyFilters"/>
				<BaseAutocomplete label="Сортировка" v-model="filters.sortOrder" :items="[{ key: 'DESC', value: 'Сначала новые' }, { key: 'ASC', value: 'Сначала старые' }]" placeholder="Все" @change="applyFilters"/>
				<BaseAutocomplete label="Лимит" v-model.number="limit" :items="[{ key: 10, value: '10' }, { key: 25, value: '25' }, { key: 50, value: '50' }, { key: 100, value: '100' }]" placeholder="Все" @change="applyFilters"/>
			</div>

			<div v-if="loadError" class="tp-message error spaced">
				<BaseIcon name="mdi-alert-circle" size="1.2em"/>
				<span>{{ loadError }}</span>
			</div>

			<BaseTable
				:key="`tariffs-page-${page}`"
				:columns="columns"
				:rows="tableRows"
				:loading="isLoading"
				:row-style="getColorSet"
				rowKey="id"
				pageable
				:page="page"
				:limit="limit"
				:total="total"
				@page:change="changePage"
			>
				<template #cell.id="{ row, value }">
					<section class="tp-id-cell">
						<img class="tp-month-picture" :src="getMonthImage(row)" loading="lazy">
						<span class="tp-id-value">{{ value }}</span>
					</section>
				</template>

				<template #cell.created="{ row, value }">
					<span class="tp-month-name">на {{ getMonthTitle(row) }}</span>
					<div class="tp-date">{{ formatDate(value as Date) }}</div>
				</template>

				<template #cell.type="{ value }">
					<span class="tp-type">{{ getTypeLabel(String(value)) }}</span>
				</template>

				<template #cell.value="{ value }">
					<span class="tp-value badge">
						{{ value }}
					</span>
				</template>

				<template #cell.actions="{ row }">
					<div class="tp-actions">
						<BaseButton variant="secondary" prependIcon="mdi-pencil" @click.stop="editTariff(row)">Изменить</BaseButton>
						<BaseButton variant="secondary" prependIcon="mdi-content-copy" @click.stop="copyTariff(row)">Копия</BaseButton>
						<BaseButton variant="secondary" prependIcon="mdi-delete-outline" :disabled="deletingTariffId === Number(row.id)" @click.stop="deleteTariff(row)">
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
const noOfficeKey = 'NO_OFFICE';

type TariffForm = {
	value: number | string,
	type: TariffType | '',
	date: string,
	officeId: number | typeof noOfficeKey,
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
	nds?: number | null,
	nsp?: number | null,
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
	// { key: 'date', label: 'Дата', width: '130px' },
	{ key: 'created', label: 'Создан', width: '50px' },
	{ key: 'value', label: 'Тариф', width: '120px' },
	{ key: 'type', label: 'Тип', width: '120px' },
	{ key: 'actions', label: '', width: '300px', cellClass: 'tp-actions-cell' },
];

const typeOptions = [
	{ key: 'FL', value: 'Физ. лицо' },
	{ key: 'UL', value: 'Юр. лицо' },
];

const offices: Record<number, string> = {
	// 1: 'г.Кара-Балта, ул.Садовая,112',
	// 2: 'с.Ленинское, ул.Алма-Атинская,248',
	// 3: 'с. Аманбаево - ул. Толстунова, 8',
	// 4: 'г. Ош - ул. Ленина, 146',
	// 5: 'г. Джалал-Абад - ул. Ленина, 2',
	14: 'Майлы-Суу - ул. Коммунистическая, б/н',
	// 15: 'ул.И. Ахунбаева,186/1',
	// 16: 'Жибек-Жолу, 150',
	// 19: 'г.Кант, ул.Маликова,6',
};

const officeOptions = computed(() => [
	{ key: noOfficeKey, value: 'Не выбрано' },
	...Object.entries(offices).map(([key, value]) => ({
		key: Number(key),
		value,
	})),
]);

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

function getFirstDayOfMonth(baseDate = new Date()) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const day = baseDate.getDate();

  // Если сегодня до 15-го числа -> 1-е число текущего месяца.
  // Если 15-е число и позже -> 1-е число следующего месяца.
  return day < 15 
    ? new Date(year, month, 1) 
    : new Date(year, month + 1, 1);
}

function getInitialForm(): TariffForm {
	return {
		value: 0,
		type: 'FL',
		date: getFirstDayOfMonth().toLocaleDateString('fr-CA'),
		officeId: noOfficeKey,
		nds: '',
		nsp: '',
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
		...(form.value.officeId !== noOfficeKey ? { officeId: form.value.officeId } : {}),
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

function getMonthImage(row: Record<string, unknown>) {
	const tariffDate = getTariffDate(row);
	const monthName = tariffDate?.toLocaleString('en-EN', { month: 'short' }).toLowerCase() ?? 'jan';

	return `/pics/${monthName}.webp`;
}

const capitalize = (str: string) => str ? str.charAt(0).toUpperCase() + str.slice(1) : "";

function getMonthTitle(row: Record<string, unknown>) {
	const tariffDate = getTariffDate(row);
	return tariffDate?.toLocaleString('ru-RU', { month: 'long' }) ?? '';
}

function getTariffDate(row: Record<string, unknown>) {
	const value = row.date ?? row.created;
	const date = new Date(String(value));

	return Number.isNaN(date.getTime()) ? null : date;
}

function getColorSet(row: Record<string, unknown>) {
	const colors = [
		{
			badgeBg: '#DCEAFC',
			badgeColor: '#084698',
			rowBg: '#F5F8FE'
		},
		{
			badgeBg: '#D9E8FB',
			badgeColor: '#013988',
			rowBg: '#F7F9FD'
		},
		{
			badgeBg: '#E9F2DC',
			badgeColor: '#4B8A00',
			rowBg: '#FAFBF6'
		},
		{
			badgeBg: '#FDE2EA',
			badgeColor: '#C60A44',
			rowBg: '#FEF8FA'
		},
		{
			badgeBg: '#EAF4DC',
			badgeColor: '#0C7202',
			rowBg: '#F9FBF5'
		},
		{
			badgeBg: '#FEF2CD',
			badgeColor: '#A96B00',
			rowBg: '#FFFAEE'
		},
		{
			badgeBg: '#D6F1F2',
			badgeColor: '#086A6E',
			rowBg: '#F4FBFB'
		},
		{
			badgeBg: '#FEECCB',
			badgeColor: '#D65F0F',
			rowBg: '#FDF8EF'
		},
		{
			badgeBg: '#FCEBD6',
			badgeColor: '#8A310D',
			rowBg: '#FEFAF4'
		},
		{
			badgeBg: '#FDE6CD',
			badgeColor: '#C7471C',
			rowBg: '#FEF6EF'
		},
		{
			badgeBg: '#EEE6DD',
			badgeColor: '#69492D',
			rowBg: '#F9F5F3'
		},
		{
			badgeBg: '#DDE9FB',
			badgeColor: '#054C97',
			rowBg: '#F2F6FE'
		}
	];
	const monthIndex = getTariffDate(row)?.getMonth() ?? 0;
	const colorSet = colors[monthIndex ?? 0];

	return {
		'--badge-bg': colorSet.badgeBg,
		'--badge-color': colorSet.badgeColor,
		'--row-bg': colorSet.rowBg,
	};
}

function normalizeInputDate(value: unknown) {
	if(!value) return null;

	const stringValue = String(value);
	if(/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) return stringValue;

	const date = new Date(stringValue);
	if(Number.isNaN(date.getTime())) return null;

	return date.toISOString().slice(0, 10);
}
</script>

<style lang="scss">
.tariffs-page {
	color: #172b4d;

	.tp-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1em;
		margin-top: .8em;

		.tp-title {
			margin: 0;
			font-size: 28px;
			line-height: 1.2em;
		}

		.tp-header-actions {
			display: flex;
			align-items: center;
			gap: .7em;
			flex-wrap: wrap;
			justify-content: flex-end;
		}
	}

	.tp-form {
		display: flex;
		flex-direction: column;
		gap: 1em;

		.tp-form-grid {
			display: grid;
			grid-template-columns: repeat(3, minmax(180px, 1fr));
			gap: 1em;
		}

		.tp-message {
			align-items: center;
			border-radius: 8px;
			display: flex;
			font-size: 13px;
			gap: 8px;
			padding: 10px 12px;

			&.success {
				background: #e7f8ef;
				color: #058039;
			}

			&.error {
				background: #f8e7e7;
				color: #d32f2f;
			}
		}

		.tp-form-actions {
			display: flex;
			align-items: center;
			gap: .7em;
			flex-wrap: wrap;
		}
	}

	.tp-filters {
		display: flex;
		align-items: flex-end;
		gap: 1em;
		flex-wrap: wrap;
		margin-bottom: 1em;
	}

	.tp-message {
		align-items: center;
		border-radius: 8px;
		display: flex;
		font-size: 13px;
		gap: 8px;
		padding: 10px 12px;

		&.error {
			background: #f8e7e7;
			color: #d32f2f;
		}

		&.spaced {
			margin-bottom: 1em;
		}
	}

	.base-table {
		.bt-tbody {
			tr {
				border-radius: 7px;
				overflow: hidden;
				background: var(--row-bg, #fff);
			}

			.base-table__cell {
				&:has(.tp-id-cell) {
					position: relative;
					height: 80px;
					min-height: 60px;
				}
			}

			.tp-id-cell {
				.tp-month-picture {
					position: absolute;
					left: 0;
					bottom: 0;
					height: 100%;
					object-fit: cover;
					border-radius: 7px;
					// opacity: .34;
					pointer-events: none;
				}

				.tp-id-value {
					position: relative;
					top:-26px;
					left: 80px;
					z-index: 1;
					font-weight: 700;
					color:#00000055;
					filter: drop-shadow(0 0 1px #fff);
				}
			}

			td:has(.tp-date) {
				position: relative;
				z-index: 1;
				text-align: center;

				.tp-date {
					font-size: .8em;
					margin-top: .6em;
					color: #777;
				}
			}

			.tp-type {}

			td:has(.tp-value) {
				position: relative;
				z-index: 1;
				text-align: center;
			}
		}

		.tp-actions-cell {
			text-align: right;

			.tp-actions {
				display: flex;
				justify-content: flex-end;
				gap: .5em;
			}
		}

		.badge {
			// display: inline-flex;
			// align-items: center;
			// justify-content: center;
			border-radius: 999px;
			background: var(--badge-bg, #eef4ff);
			color: var(--badge-color, #114bc8);
			font-weight: 700;
			padding: .3em 1em;
			position: relative;
			z-index: 100;
		}
	}
}

@media (max-width: 900px) {
	.tariffs-page {
		.tp-header {
			align-items: stretch;
			flex-direction: column;

			.tp-header-actions {
				justify-content: flex-start;
			}
		}

		.tp-form {
			.tp-form-grid {
				grid-template-columns: 1fr;
			}
		}

		.tp-actions {
			justify-content: flex-start;
		}
	}
}
</style>
