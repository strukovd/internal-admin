<template>
	<div class="text-box" :class="{ 'invalid': error }">
		<label>
			<div class="text-box-wrapper">
				<header class="header" style="display:flex; align-items:start; padding-right:1em;">
					<div v-if="label" class="caption-container" style="flex:auto 1 1;">
						<span class="caption">{{ label }}</span>
					</div>
					<div v-if="error" class="error-container" style="display:flex; gap:.2em; justify-content:flex-end; font-size:14px; color:red; opacity:.6; line-height:1.4em;">
						<BaseIcon name="mdi-alert-decagram"></BaseIcon>
						<span class="error-message">{{ error }}</span>
					</div>
				</header>
				<section class="text-box-section">
					<BaseIcon v-if="prependIcon" class="prepend-icon" :name="prependIcon"></BaseIcon>
					<textarea :style="{ height, resize }" :type="type" :placeholder="placeholder" :value="modelValue" @input="onInput"></textarea>
					<BaseIcon v-if="appendIcon" class="append-icon" :name="appendIcon"></BaseIcon>
				</section>
			</div>
		</label>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import BaseIcon from '~/components/common/base/BaseIcon.vue';

export default defineComponent({
	// TODO: добавить .lazy директиву
	name: 'BaseTextBox',
	emits: [ 'update:modelValue' ],
	components: { BaseIcon },
	props: {
		modelValue: [ String, Number ],
		label: String,
		prependIcon: String,
		appendIcon: String,
		placeholder: String,
		height: String,
		resize: { type: String as () => 'none' | 'both' | 'horizontal' | 'vertical', default: 'none' },
		type: {
			type: String as () => 'text' | 'password' | 'color'
				| 'date' | 'datetime'
				| 'datetime-local' | 'month' | 'tel'
				| 'time' | 'url' | 'week' | 'email' | 'number',
			default: 'text'
		},
		error: String
	},
	data() {
		return {
			hideValue: false
		};
	},
	methods: {
		onInput(event: Event) {
			this.$emit('update:modelValue', (event.target as any)?.value ?? '');
		}
	},
	created() {
		this.hideValue = this.type === 'password';
	},
});
</script>

<style lang="scss">
.text-box {
	.text-box-wrapper {
		// margin:0 0 .6em 0;

		.caption {
			font-size:14px;
			opacity:.6;
			line-height: 1.4em;
			margin-bottom: .4em;
		}
		.text-box-section {
			display:flex;
			align-items: center;
			white-space: nowrap;
			text-wrap: nowrap;
			// font-size: 16px;
			background: #FFFFFF;
			border-radius: 6px;
			border: 1px solid #E0E2E791;
			line-height: 1.4em;
			font-weight: 500;
			box-shadow: none;
			padding: .4em .4em .4em .6em;


			&:focus-within {
				box-shadow: 0 0 0 2px #0079C1aa;
			}

			.append-icon, .prepend-icon {
				padding-top:.1em;
				margin-right:.3em;
				opacity:.8;

				// font-size: 1.4em;
				// display: flex;
				// align-items: center;
				// padding: 1em 2em 1em 2em;
				// margin-bottom: 0;
				// font-weight: 400;
				// color: #5c6873;
				// background-color: #f0f3f5;
				// border: 1px solid #e4e7ea;
				// border-radius: 0 5px 5px 0;
			}

			&>textarea {
				font-family: inherit;
				flex: auto 1 0;
				color: inherit;
				outline: none;
				font-size: 1em;
				box-sizing: border-box;
				background: transparent;
				// padding:.5em .7em;
				padding: 0.4em .4em;
				border-style: none;
				width: 100%;
				height: 100%;

				&::placeholder {
					font-weight: 300;
					opacity: .6;
				}
			}
		}

	}

	&.invalid {
		.text-box-section {
			border-color: red;
			border-style: dashed;
			color: red;

			// outline:1px dashed red;
			// color: red;
		}
	}
}
</style>
