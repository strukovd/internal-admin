<template>
	<slot name="default"/>
	<tr v-for="(row, rowIndex) in rows" :key="rowIndex">
		<td v-for="(_cell, colIndex) in row"
			:key="`${rowIndex}:${colIndex}`"
			:contenteditable="!isCellLocked(rowIndex, colIndex)"
			spellcheck="false"
			@focusout="onInput($event, rowIndex, colIndex)"
			@keydown.enter.prevent="focusNext(rowIndex, colIndex)"
			:class="['cell', { locked: isCellLocked(rowIndex, colIndex) }]"
		>
			{{ rows[rowIndex][colIndex] }}
		</td>
	</tr>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
// TODO: Добавить статичные (обязательные) ячейки и параметр prettify для них (что бы в режиме просмотра отображались красиво)

export default defineComponent({
	emits: [ 'update:modelValue' ],
	props: {
		cols: { required: true, type: Number },
		modelValue: { required: true, type: Array as () => string[][] },
		presetKeys: { type: Array as () => string[], default: () => [] },
	},
	data() {
		return {
			rows: [] as string[][],
		};
	},
	watch: {
		modelValue: {
			immediate: true,
			handler( newVal ) {
				// Копируем входящие данные или создаем первую пустую строку
				const hasData = Array.isArray(newVal) && newVal.length > 0;
				const baseRows = hasData
					? newVal.map(row => [ ...row ])
					: [ this.createEmptyRow(this.cols) ];

				this.rows = this.applyPresetRows(baseRows);
				this.ensureInvariants();
			},
		},
	},
	methods: {
		createEmptyRow(cols: number) {
			return Array.from({ length: cols }, () => '');
		},

		trim(val: string | null | undefined) {
		// убираем неразрывные пробелы/мягкие переводы строк/BR'ы, лишние пробелы
		return (val ?? '')
			.replace(/\u00A0/g, ' ')
			.replace(/\u200B/g, '')
			.replace(/<br\s*\/?>/gi, '\n')
			.replace(/\s+/g, ' ')
			.trim();
		},

		isRowEmpty(row: string[], rowIndex: number) {
			if (this.isPresetRow(rowIndex)) return false;
			return row.every(c => this.trim(c) === '');
		},

		ensureInvariants() {
			// 1) убрать пустые внутренние строки (все, кроме последней)
			if (this.rows.length > 1) { // Если строк больше одной
				const lastIdx = this.rows.length - 1;
				this.rows = this.rows.filter((r, i) => i === lastIdx || !this.isRowEmpty(r, i)); // Оставляем только последнюю и не пустые строки
			}

			// 2) снизу всегда одна пустая
			if (this.rows.length === 0) { // Если строк нет, добавляем пустую строку
				this.rows.push(this.createEmptyRow(this.cols));
			} // Если последняя строка не пустая, добавляем пустую строку
			else if (!this.isRowEmpty(this.rows[this.rows.length - 1], this.rows.length - 1)) {
				this.rows.push(this.createEmptyRow(this.cols));
			}
			// else { // Когда строки есть и последняя пустая, если вдруг накопились несколько пустых в конце — оставим одну
			// 	while ( // Пока
			// 		this.rows.length > 1 && // строк больше одной
			// 		isRowEmpty(this.rows[this.rows.length - 1]) && // две последние строки пустые
			// 		isRowEmpty(this.rows[this.rows.length - 2])
			// 	) {
			// 		this.rows.pop();
			// 	}
			// }
		},

		onInput(e: Event, rowIndex: number, colIndex: number) {
			if (this.isCellLocked(rowIndex, colIndex)) return;
			// Записываем значение из DOM-ячейки в модель данных
			const el = e.target as HTMLElement;
			const text = this.trim(el.textContent ?? el.innerText);
			this.rows[rowIndex][colIndex] = text;

			this.$emit('update:modelValue', this.rows);
			this.ensureInvariants();
		},

		focusNext(rowIndex: number, colIndex: number) {
			// переход по Enter к след. ячейке/строке, добавляя хвостовую пустую при необходимости
			const lastRowIdx = this.rows.length - 1;
			if (rowIndex === lastRowIdx && !this.isRowEmpty(this.rows[rowIndex], rowIndex)) {
				this.rows.push(this.createEmptyRow(this.cols));
			}

			let nextRow = rowIndex;
			let nextCol = colIndex + 1;
			if (nextCol >= this.cols) {
				nextCol = 0;
				nextRow = Math.min(rowIndex + 1, this.rows.length - 1);
			}

			// Фокус на следующую ячейку
			queueMicrotask(() => {
				// TODO: селектор будет путаться если будет несколько таблиц, обеспечить уникальность
				const cell = document.querySelectorAll<HTMLTableCellElement>('tbody td')[nextRow * this.cols + nextCol];
				if (cell) {
					cell.focus();
					this.placeCaretAtEnd(cell);
				}
			});
		},

		placeCaretAtEnd(node: HTMLElement) {
			const range = document.createRange();
			range.selectNodeContents(node);
			range.collapse(false);
			const sel = window.getSelection();
			sel?.removeAllRanges();
			sel?.addRange(range);
		},

		applyPresetRows(inputRows: string[][]) {
			if (!this.presetKeys.length) return inputRows;

			const byKey = new Map<string, string[]>();
			for (const row of inputRows) {
				const key = this.trim(row[0] ?? '');
				if (key) byKey.set(key, row);
			}

			const presetRows = this.presetKeys.map((key) => {
				const existing = byKey.get(key);
				if (existing) return [key, ...existing.slice(1)];
				const row = this.createEmptyRow(this.cols);
				row[0] = key;
				return row;
			});

			const presetSet = new Set(this.presetKeys.map(k => this.trim(k)));
			const restRows = inputRows.filter((row) => !presetSet.has(this.trim(row[0] ?? '')));

			return [ ...presetRows, ...restRows ];
		},

		isPresetRow(rowIndex: number) {
			const key = this.trim(this.rows[rowIndex]?.[0] ?? '');
			return this.presetKeys.includes(key);
		},

		isCellLocked(rowIndex: number, colIndex: number) {
			return colIndex === 0 && this.isPresetRow(rowIndex);
		},
	},
});
</script>

<style lang="scss">

</style>
