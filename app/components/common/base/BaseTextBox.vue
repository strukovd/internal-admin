<template>
	<div class="base-text-box" :class="{ 'invalid': error }" @keydown.enter="onSubmit" >
		<!-- FEATURES
		- [+] label
		- [+] placeholder
		- [+] autofocus
		- [+] error
		- [+] disabled
		- [+] readonly
		- [+] button
		- [+] appendIcon
		- [+] prependIcon
		- [+] type
		- [+] value
		- [+] name
		- [+] mask
	
			safari
		-->
		<label>
			<div class="text-box-wrapper">
				<header class="header" style="display:flex; align-items:start; padding-right:1em;">
					<div v-if="label" class="caption-container" style="flex:auto 1 1;">
						<span class="caption">{{ label }}</span>
					</div>
					<div v-if="error" class="error-container" style="display:flex; gap:.2em; justify-content:flex-end; font-size:14px; color:red; opacity:.6; line-height:1.4em;">
						<!-- <BaseIcon name="mdi-alert-decagram" size="1.2em"/> -->
						<span class="error-message">{{ error }}</span>
					</div>
				</header>

				<div class="text-box-area">
					<BaseIcon v-if="prependIcon" class="prepend-icon" size="1.4em" :name="prependIcon"/>
					<input :name="name" :type="type === 'password' ? (masked ? 'password' : 'text') : type" :placeholder="placeholder" :autofocus="autofocus" :value="valueProxy" @input="onInput"/>
					<BaseIcon @click="masked = !masked" v-if="type === 'password'" class="append-icon" size="1.4em" :name="masked ? 'mdi-eye-off' : 'mdi-eye'"/>
					<BaseIcon v-else-if="appendIcon" class="append-icon" size="1.4em" :name="appendIcon"/>
					<BaseButton v-if="button" @click="onSubmit" variant="secondary">{{ button }}</BaseButton>
				</div>
			</div>
		</label>
	</div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import BaseButton from '~/components/common/base/BaseButton.vue';
import BaseIcon from '~/components/common/base/BaseIcon.vue';

export default defineComponent({
	// TODO: добавить .lazy директиву
	name: 'BaseTextBox',
	components: { BaseButton, BaseIcon },
	emits: ['update:modelValue', 'submit'],
	props: {
		modelValue: {
			type: [String, Number] as PropType<string | number | undefined>,
		},
		name: String,
		label: String,
		prependIcon: String,
		appendIcon: String,
		autofocus: Boolean,
		placeholder: String,
		type: {
			type: String as () => 'text' | 'password' | 'color'
				| 'date' | 'datetime'
				| 'datetime-local' | 'month' | 'tel'
				| 'time' | 'url' | 'week' | 'email' | 'number',
			default: 'text'
		},
		button: String,
		error: String as () => string | null | undefined,
		mask: String // пример: "+996 (###) ## ## ##" (# — цифра, A — буква, * — любой символ)
	},
	data() {
		return {
			innerValue: (this.modelValue ?? '') as string | number,
			masked: false
		};
	},
	computed: {
		// Универсальный прокси: если передан v-model — читаем/пишем через проп/эмит,
		// иначе — работаем с внутренним состоянием.
		valueProxy: {
			get(): string | number {
				return this.modelValue !== undefined ? this.modelValue : this.innerValue;
			},
			set(v: string | number) {
				this.innerValue = v;
				// Всегда эмитим обновление, чтобы родитель получил значение даже при стартовом undefined.
				this.$emit('update:modelValue', v);
			}
		}
	},
	methods: {
		applyMask(value: string) {
			if (!this.mask) return value;

			const mask = this.mask;
			const input = value ?? '';
			let maskedValue = '';
			let maskIndex = 0;
			let inputIndex = 0;

			while (maskIndex < mask.length && inputIndex < input.length) {
				const maskChar = mask[maskIndex];
				const inputChar: string = input[inputIndex]!;

				if (maskChar === '#') {
					if (/\d/.test(inputChar)) {
						maskedValue += inputChar;
						maskIndex++;
					}
					inputIndex++;
				} else if (maskChar === 'A') {
					if (/[a-zA-Z]/.test(inputChar)) {
						maskedValue += inputChar;
						maskIndex++;
					}
					inputIndex++;
				} else if (maskChar === '*') {
					maskedValue += inputChar;
					maskIndex++;
					inputIndex++;
				} else {
					maskedValue += maskChar; // Статический символ маски (скобки, пробелы и т.п.)
					if (inputChar === maskChar) {
						inputIndex++;
					}
					maskIndex++;
				}
			}

			return maskedValue;
		},
		onSubmit(event: KeyboardEvent) {
			const valueCopy = this.modelValue !== undefined ? this.modelValue : this.innerValue;
			this.$emit('submit', valueCopy, event);
		},
		onInput(event: Event) {
			const val = (event.target as HTMLInputElement)?.value ?? '';
			const masked = this.mask ? this.applyMask(val) : val;
			if (this.mask && event.target) {
				(event.target as HTMLInputElement).value = masked;
			}

			this.valueProxy = this.type === 'number' && !this.mask ? Number(masked) : masked;
		}
	},
	created() {
		this.masked = this.type === 'password';
	},
	watch: {
		// Если родитель всё же начал менять modelValue — синхронизируем стартовое внутреннее значение
		modelValue(newVal) {
			if (newVal !== undefined) {
				const raw = typeof newVal === 'number' ? String(newVal) : (newVal as string);
				this.innerValue = this.mask ? this.applyMask(raw) : (newVal as string | number);
			}
		}
	}
	});
</script>

<style lang="scss">
.base-text-box {
	.text-box-wrapper {
		// margin: 0 0 .6em 0;

		.caption {
			font-size: 14px;
			opacity: .6;
			line-height: 1.4em;
			margin-bottom: .4em;
		}

		.text-box-area {
			display: flex;
			align-items: center;
			white-space: nowrap;
			text-wrap: nowrap;
			font-size: 16px;
			background: #FFFFFF;
			border-radius: 7px;
			border: 1px solid #d4d4d4;
			line-height: 1.4em;
			font-weight: 500;
			box-shadow: none;
			padding: .2em .4em .2em .6em;

			.append-icon, .prepend-icon {
				color: #a3a3a3;
			}

			&:focus-within {
				border-color: #2563ea80;
				box-shadow: 0 0 0 2px #2563ea80;
			}

			& > input {
				flex: auto 1 0;
				color: inherit;
				outline: none;
				font-size: 16px;
				box-sizing: border-box;
				background: transparent;
				// padding:.5em .7em;
				padding: 0.4em .4em;
				border-style: none;

				&::placeholder {
					color: #95a3b8;
					font-weight: 300;
					opacity: .6;
				}
			}
		}

	}

	&.invalid {
		.text-box-area {
			border-color: red;
			border-style: dashed;
			color: red;
		}
	}
}
</style>
