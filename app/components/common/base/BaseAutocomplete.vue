<template>
	<div class="base-autocomplete-wrapper" :class="{ 'invalid': error }">
		<label>
			<header class="header" style="display:flex; align-items:start; padding-right:1em;">
				<div v-if="label" class="caption-container" style="flex:auto 1 1;">
					<span class="caption">{{ label }}</span>
				</div>
				<div v-if="error" class="error-container" style="display:flex; gap:.2em; justify-content:flex-end; font-size:14px; color:red; opacity:.6; line-height:1.4em;">
					<!-- <v-icon icon="mdi-alert-decagram" size="1.2em"></v-icon> -->
					<span class="error-message">{{ error }}</span>
				</div>
			</header>
			<div class="input-container">
				<span class="selected-items" v-if="multiple && selectedItems.length">
					<span class="item-badge" v-for="selectedItem of selectedItems" :key="selectedItem[fieldKey]">
						<!-- <BaseIcon class="append-icon" size="1.4em" :name="selectedItem.icon ?? 'mdi-menu-down'"/> -->
						<!-- <v-icon v-if="selectedItem.icon" :icon="selectedItem.icon" size="1.2em" style="margin-right:.1em; opacity:.8;"></v-icon> -->
						<span>{{ selectedItem[fieldValue] }}</span>
						<!-- <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x text-[#005FF2] dark:text-[#47A8FF]" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg> -->
						<BaseIcon @click="removeItem(selectedItem[fieldKey])" class="remove-badge" name='mdi-close'/>
					</span>
				</span>

				<!-- Если одиночный выбор и у выбранного элемента есть инконка, показываем ее -->
				<!-- <v-icon v-if="!multiple && selectedItems.length && selectedItems[0].icon" :icon="selectedItems[0].icon" size="1.4em"></v-icon>
				<v-icon v-else-if="appendIcon" :icon="appendIcon" size="1.4em"></v-icon> -->
				<input
					type="text"
					:placeholder="placeholder"
					:class="{ selected: selectedItems.length }"
					v-model="searchValue"
					@focus="onFocusOrBlur(true)"
					@blur="onFocusOrBlur(false)"
					@input="onInput"
					@keydown="onKeydown"
				>
				{{ appendIcon }}
				<BaseIcon class="append-icon" size="1.4em" :name="appendIcon ?? 'mdi-menu-down'"/>
				<!-- <template v-else>
					<BaseIcon name="mdi-menu-down" style="transform: rotate(180deg);"/>
				</template> -->
				<!-- <v-icon v-if="!multiple && selectedItems.length" @click="resetItems()" icon="mdi-close" size="1.4em" style="position:absolute;right:0; cursor:pointer; background:#f5f5f5; padding:0 .8em; border-radius:6px; margin-right:.5em;"></v-icon> -->

				<div v-if="loading" class="loader">
					<!-- <VProgressCircular width="2.5" size="22" indeterminate color="primary"></VProgressCircular> -->
				</div>
				<!-- <BaseButton :prepend-icon="'mdi-check'" @click="selectItem(selectedItems[0])">Выбрать</BaseButton> -->
			</div>
		</label>
		<ul v-if="visibleDropdown" class="dropdown">
			<li
				:key="index"
				v-for="(item, index) of filteredItems"
				class="dropdown-item"
				:class="{focusedItem: focusedItem === index}"
				@mousedown="selectItem(item)"
			>
				<span>
					<!-- <v-icon v-if="item.icon" :icon="item.icon" size="1.2em" style="margin-right:.3em; opacity:.8;"></v-icon> -->
					<span>{{ item[fieldValue] }}</span>
					<span v-if="showKey" style="opacity:.3; margin-left:.3em">{{ item[fieldKey] }}</span>
				</span>
			</li>
			<li class="dropdown-item"><span v-if="filteredItems?.length === 0">Ничего не найдено</span></li>
		</ul>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import BaseIcon from '~/components/common/base/BaseIcon.vue';

export default defineComponent({
	name: 'BaseAutocomplete',
	emits: [ 'update:modelValue', 'change' ],
	components: { BaseIcon },
	props: {
		modelValue: [String, Number, Array] as any,
		label: String,
		placeholder: String,
		appendIcon: String,
		items: Array as () => any[],
		autoselect: Boolean,
		multiple: Boolean,
		showKey: Boolean,
		loading: Boolean,
		error: String,

		fieldKey: { type: String, default: 'key' },
		fieldValue: { type: String, default: 'value' },
		emitValue: { type: Boolean, default: false } // если true, возвращаем value вместо key
	},
	data() {
		return {
			searchValue: '',
			focused: false,
			visibleDropdown: false,

			focusedItem: -1,
			selectedItems: [] as any[],
		};
	},
	computed: {
		filteredItems() {
			// TODO: пересмотреть логику, т.к. в !multiple режиме выбранное значение остается в searchValue,
			// из-за этого, при клике исключается выбранный элемент, и не учитывается поиск (т.к. там отображается выбранный жлемент)
			// Но для multiple режима, выбранный элемент не хранится в searchValue и нужно учитываеть поиск для выбора нескольких элементов
			// Из-за этого логика становится запутанной, решение: - не хранить выбранное в searchValue или вынести multiple режим в отдельный компонент
			if(this.items) {
				if(!this.multiple) {
					// Если есть уже выбранный элемент
					if(this.selectedItems.length) {
						// Исключаем выбранные элементы из списка (не учитывая поиск, т.к. выбранное значение сохраняется в searchValue в ед. режиме)
						const selectedKeys = this.selectedItems.map( item => String(item[this.fieldKey]) );
						return this.items.filter( item => !selectedKeys.includes(String(item[this.fieldKey]) ) );
					}
					else {
						// Искомое значение
						const resItems = this.items?.filter(
							item => {
								const lowerKey = String(item[this.fieldKey]).toLowerCase();
								const lowerValue = String(item[this.fieldValue]).toLowerCase();
								return lowerKey.includes(this.searchValue.toLowerCase() ) || lowerValue.includes(this.searchValue.toLowerCase() );
							}
						);

						return resItems;
					}
				}
				else {
					// Учитываем искомое значение
					const resItems = this.items?.filter(
						item => {
							const lowerKey = String(item[this.fieldKey]).toLowerCase();
							const lowerValue = String(item[this.fieldValue]).toLowerCase();
							return lowerKey.includes(this.searchValue.toLowerCase() ) || lowerValue.includes(this.searchValue.toLowerCase() );
						}
					);

					// Исключаем выбранные элементы из списка
					if(this.selectedItems.length) {
						const selectedKeys = this.selectedItems.map( item => String(item[this.fieldKey]) );
						return resItems.filter( item => !selectedKeys.includes(String(item[this.fieldKey]) ) );
					}

					return resItems;
				}
			}

			return [];
		}
	},
	methods: {
		syncFromModel(val: any) {
			const emitField = this.getEmitField();

			if (this.multiple) {
				const values = Array.isArray(val) ? val : (val !== undefined && val !== null ? [val] : []);
				const matched = values
					.map(v => this.items?.find(item => String(item[emitField]) === String(v)))
					.filter(Boolean) as any[];

				this.selectedItems = matched;
				this.searchValue = '';
				return;
			}

			if (val === undefined || val === null || val === '') {
				this.selectedItems = [];
				this.searchValue = '';
				return;
			}

			const selectedItem = this.items?.find(item => String(item[emitField]) === String(val));
			if (selectedItem) {
				this.selectedItems = [selectedItem];
				this.searchValue = selectedItem[this.fieldValue];
			} else {
				// значение есть, но в items его нет — отобразим как строку
				this.selectedItems = [];
				this.searchValue = String(val);
			}
		},
		getEmitField() {
			return this.emitValue ? this.fieldValue : this.fieldKey;
		},
		selectItem(item: any) {
			if(item) {
				let emitedValue;
				const emitField = this.getEmitField();
				if(this.multiple) { // режим мульти выбора
					this.searchValue = '';
					this.selectedItems.push(item);
					// $emit массив ключей/значений
					emitedValue = this.selectedItems.map( selected => String(selected[emitField]) );
				}
				else {
					this.searchValue = item[this.fieldValue];
					this.selectedItems = [item];
					// $emit один ключ/значение
					emitedValue = item[emitField];
				}

				this.$emit('update:modelValue', emitedValue );
				this.$emit('change', emitedValue ); // нужно для (родителя) внешней обработки выбора элемента, когда не используется v-model
				this.hideDropdown();
			}
		},
		removeItem(key: string) {
			const index = this.selectedItems.findIndex(item => item[this.fieldKey] === key);
			this.selectedItems.splice(index, 1);
		},
		resetItems() {
			this.searchValue = '';
			this.selectedItems = [];
			this.$emit('update:modelValue', undefined );
			this.$emit('change', undefined );
		},
		showDropdown() {
			this.visibleDropdown = true;
		},
		hideDropdown() {
			setTimeout(()=>{ // Задерка setTimeout нужна т.к. при клике (теряется фокус и) список скрывается раньше чем выбирается пункт
				this.visibleDropdown = false;
			}, 10);
		},
		onInput() {
			this.showDropdown();
			if(!this.multiple && this.selectedItems.length) { // В одиночном режиме, удаляем выбранный элемент при любом вводе (т.к. иначе элемент остается скрытно выбранным)
				this.selectedItems.pop();
			}
		},
		onKeydown(e: KeyboardEvent) {
			switch(e.keyCode) {
				case 9: // Tab
				case 13: // Enter
					if(this.filteredItems?.length && this.visibleDropdown) {
						this.selectItem( this.filteredItems[this.focusedItem] );
						e.stopPropagation();
						e.preventDefault();
					}
					break;
				case 27: // Escape
					if(this.visibleDropdown) {
						this.hideDropdown();
						e.stopPropagation(); // Если список невиден, не должен прерывать родительское поведение esc
					}
					break;
				case 8: // Backspace
					if(this.searchValue === '') {
						// Удаляем теги
						if( e.ctrlKey ) {
							this.selectedItems = [];
						}
						else {
							this.selectedItems.pop();
						}
					}
					break;
				case 38: // ArrowUp
					if(this.filteredItems) {
						if(!this.visibleDropdown) {
							this.showDropdown();
							return;
						}
						if(--this.focusedItem < 0) {
							this.focusedItem = this.filteredItems?.length-1;
						}
					}
					break;
				case 40: // ArrowDown
					if(this.filteredItems) {
						if(!this.visibleDropdown) {
							this.showDropdown();
							return;
						}
						if(++this.focusedItem >= this.filteredItems?.length) {
							this.focusedItem = 0;
						}
					}
					break;
			}
		},
		onFocusOrBlur(focused: boolean) {
			if(focused) {
				this.showDropdown();
			}
			else {
				this.hideDropdown();
			}

			this.focused = focused;
		},
		init() {
			// Если указано ранее выбранное значение, ищем его ключ в списке и отмечам выбранным
			if( this.modelValue ) {
				const emitField = this.getEmitField();
				if(this.multiple && Array.isArray(this.modelValue)) {
					const matchingItems = this.modelValue
						.map(val => this.items?.find(item => String(item[emitField]) === String(val)))
						.filter(Boolean) as any[];

					if(matchingItems.length) {
						this.searchValue = '';
						this.selectedItems = matchingItems;
						const emitedValue = matchingItems.map(item => String(item[emitField]));
						this.$emit('update:modelValue', emitedValue );
					}
				}
				else {
					const selectedItem = this.items?.find( item => String(item[emitField]) === String(this.modelValue) );
					if(selectedItem) this.selectItem(selectedItem);
				}
			}
			else {
				// При autoselect, сразу выбираем первый элемент
				if(this.autoselect && this.items?.length ) {
					this.selectItem( this.items[0] );
				}
			}
		}
	},
	watch: {
		modelValue: {
			deep: true,
			immediate: true,
			handler(newValue) {
				this.syncFromModel(newValue);
			}
		},
		items( newValue, oldValue ) {
			if( JSON.stringify(newValue) === JSON.stringify(oldValue) ) return;

			// При обновлении списка
			this.syncFromModel(this.modelValue);
		}
	},
	created() {
		this.init();
	},
	unmounted() {
		this.$emit('update:modelValue', undefined );
	}
});
</script>

<style lang="scss">
.base-autocomplete-wrapper {
	position:relative;

	label {
		.caption {
			font-size:14px;
			opacity:.6;
			line-height: 1.4em;
			margin-bottom: .4em;
		}
		.input-container {
			// margin:0 0 .6em 0;
			display: flex;
			align-items: center;
			white-space: nowrap;
			text-wrap: nowrap;
			font-size: 16px;
			background: #FFFFFF;
			border-radius: 6px;
			border: 1px solid #E0E2E791;
			line-height: 1.4em;
			font-weight: 500;
			box-shadow: none;
			padding: .4em .4em .4em .6em;

			.selected-items {
				flex: auto 0 0;
				white-space: nowrap;
				// box-sizing: border-box;
				margin: 0;
				padding:0 .4em;
				display: flex;
				gap: 0 .3em;
				// color: #334155;
				// user-select: none;

				.item-badge {
					display: inline-block;
					// background-color: #e6eef9;
					text-wrap: nowrap;
					padding:.2em .6em;
					transition: 0.25s ease-out;
					border-radius: 5px;
					background-color: rgb(240 247 255);
					font-weight: 300;
					color: rgb(0 95 242 / .9);
					border:1px solid rgb(203 231 255);
					font-size: .85em;

					// background-color: #0079C1;
					// color: #ffffffdd;
					.remove-badge {
						cursor: pointer;
						margin-left: .3em;
						opacity: .6;
						transition: 0.25s ease-out;
						&:hover {
							opacity: 1;
						}
					}
				}
			}


			&:focus-within {
				box-shadow: 0 0 0 2px #0079C1aa;
			}

			&:has(input.selected) {
				// color: #195274;
				// background-color: #f5f5f5;
				// border: 1px solid #fafaff;
				// font-weight: 900;
			}
			&>input {
				flex: auto 1 0;
				color: inherit;
				outline: none;
				font-size: 16px;
				box-sizing: border-box;
				background: transparent;
				// padding:.5em .7em;
				padding: 0.4em .4em;
				border-style: none;

				&.selected {
					// opacity:.6;
				}

				&::placeholder {
					font-weight: 300;
					opacity: .6;
				}
			}

			.loader {
				padding:0 .6em;
			}
		}
	}

	&:has(.dropdown) .append-icon {
		transform: rotate(180deg);
	}
	.dropdown {
		box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.14);
		margin: .2em 0em;
		border-radius: 3px;
		background: #fdfdfd;
		position:absolute;
		width:100%;
		padding:0;
		max-height: 300px;
		overflow: visible;
		z-index: 999999999;

		.dropdown-item {
			line-height: 2em;
			padding:0 1.6em;
			cursor:pointer;
			list-style:none;

			&.focusedItem {
				box-shadow:inset 0 0 1px 2px cornflowerblue;
				// outline:1px solid #43a1f3;
				background:aliceblue;

				position: relative;
				z-index:100;
				border-radius:3px;
			}

			&:hover {
				background:aliceblue;
			}
		}
	}

	&.invalid {
		.input-container {
			border-color: red;
			border-style: dashed;
			color: red;

			// outline:1px dashed red;
			// color: red;
		}
	}
}
</style>
