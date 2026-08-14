<template>
	<div class="base-table-wrapper">
		<component
			:is="pageable ? BasePageable : 'div'"
			v-bind="pageableProps"
			@update:page="changePage"
		>
			<table class="base-table">
				<thead class="bt-thead">
					<tr>
						<th v-for="column in columns" :key="column.key"
							:class="['base-table__cell', 'base-table__cell--head', column.headerClass]"
							:style="{ width: column.width }"
						>
							<slot :name="`header.${column.key}`" :column="column" :label="column.label">
								{{ column.label }}
							</slot>
						</th>
					</tr>
				</thead>

				<tbody class="bt-tbody">
					<!-- Загрузка -->
					<tr v-if="loading">
						<td class="base-table__cell base-table__cell--state" :colspan="columns.length">
							<slot name="loading">Загрузка...</slot>
						</td>
					</tr>
					<!-- Нет данных -->
					<tr v-else-if="!rows.length">
						<td class="base-table__cell base-table__cell--state" :colspan="columns.length">
							<slot name="empty">Нет данных</slot>
						</td>
					</tr>
					<!-- Есть данные (строки) -->
					<tr v-else
						v-for="(row, rowIndex) of rows"
						:key="getRowKey(row, rowIndex)"
						class="base-table-row"
						@click="emit('row:click', row, rowIndex)"
					>
						<td v-for="column of columns" :key="column.key" :class="['base-table__cell', column.cellClass]">
							<slot
								:name="`cell.${column.key}`"
								:row="row"
								:value="getValue(row, column.key)"
								:column="column"
								:index="rowIndex"
								:row-index="rowIndex"
							>
								{{ getValue(row, column.key) }}
							</slot>
						</td>
					</tr>
				</tbody>
			</table>
		</component>
	</div>
</template>

<script lang="ts" setup>
import BasePageable from './BasePageable.vue';

type TableColumn = {
	key: string;
	label: string;
	width?: string;
	headerClass?: string | string[] | Record<string, boolean>;
	cellClass?: string | string[] | Record<string, boolean>;
};

type TableRow = Record<string, unknown>;

const props = withDefaults(defineProps<{
	columns: TableColumn[];
	rows: TableRow[];
	loading?: boolean;
	rowKey?: string | ((row: TableRow, index: number) => string | number);
	pageable?: boolean;
	page?: number;
	limit?: number;
	total?: number;
}>(), {
	loading: false,
	rowKey: 'id',
	pageable: false,
	limit: 10,
});
const emit = defineEmits<{
	'row:click': [row: TableRow, index: number];
	'update:page': [page: number];
	'page:change': [page: number];
}>();
const internalPage = ref(props.page ?? 1);

const currentPage = computed(() => props.page ?? internalPage.value);
const pageableProps = computed(() => props.pageable
	? {
		page: currentPage.value,
		limit: props.limit,
		total: props.total ?? props.rows.length,
	}
	: {}
);

// watch(() => props.page, (page) => {
// 	if (page) internalPage.value = page;
// });

function getValue(row: TableRow, key: string): unknown {
	// Поддержка вложенных ключей через точку, например "user.name"
	return key.split('.').reduce<unknown>((value, path) => {
		if(value && typeof value === 'object' && path in value) {
			return (value as Record<string, unknown>)[path];
		}

		return undefined;
	}, row) ?? '';
}

function getRowKey(row: TableRow, index: number): string | number {
	if(typeof props.rowKey === 'function') {
		return props.rowKey(row, index);
	}

	const value = getValue(row, props.rowKey);

	if(typeof value === 'string' || typeof value === 'number') {
		return value;
	}

	return index;
}

function changePage(page: number) {
	internalPage.value = page;
	emit('update:page', page); // для v-model
	emit('page:change', page); // для @update:page
}
</script>

<style lang="scss">
.base-table-wrapper {
	width: 100%;
	overflow-x: auto;
}

.base-table {
	width: 100%;
	border-collapse: collapse;
	font-size: 14px;

	.bt-thead {
		tr {
			border-bottom: 1px solid #e5e5e5;
		}
	}

	.bt-tbody {
		tr {
			border-bottom: 1px solid #f5f5f5;

			&:last-child {
				border-bottom: none;
			}
		}
	}

	&__cell {
		padding: 10px 12px;
		text-align: left;
		vertical-align: middle;
		white-space: nowrap;

		&--head {
			color: #525252;
			font-weight: 700;
		}

		&--state {
			padding: 24px;
			text-align: center;
			color: #777;
		}
	}
}
</style>