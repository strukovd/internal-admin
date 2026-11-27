<template>
	<button type="button"
		class="base-button"
		:class="[variant, { 'disabled': isDisabled, 'loading': loading }]"
		:disabled="isDisabled"
		:style="{
			color: !isDisabled && variant === 'secondary' && color ? color : '',
			// borderColor: !isDisabled && variant === 'secondary' && color ? color : '',
			// background: !isDisabled && variant !== 'secondary' && color ? color : ''
		}"
	>
		<BaseIcon v-if="loading" class="loading-icon" fill="currentColor" size="1.2em" name="mdi-loading"/>
		<BaseIcon v-else-if="prependIcon" fill="currentColor" size="1.2em" :name="prependIcon"/>
		<div v-if="$slots.default" class="button-text"><slot name="default"></slot></div>
		<BaseIcon v-if="appendIcon" fill="currentColor" size="1.2em" :name="appendIcon"/>
	</button>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import BaseIcon from '~/components/common/base/BaseIcon.vue';

export default defineComponent({
	name: 'BaseButton',
	components: { BaseIcon },
	props: {
		prependIcon: String,
		appendIcon: String,
		disabled: { type: Boolean, default: false },
		loading: { type: Boolean, default: false },
		color: String,
		variant: {
			type: String as () => 'primary' | 'secondary' | 'outlined' | 'light',
			default: 'primary'
		},
	},
	computed: {
		isDisabled(): boolean {
			return this.disabled || this.loading;
		},
	},
	methods: {},
});
</script>

<style lang="scss">
.base-button {
	display: inline-flex;
	align-items: center;
	gap: .3em;
	// font-size: .9em;
	// background: #0079C1;
	// color: #fff;

	// line-height:1.4em;
	// background: #EBF1FF;
	// color: #0079C1;
	border-radius: 7px;
	box-shadow: none;
	padding:.6em .8em .6em .8em;
	user-select: none;
	transition:all 300ms ease 0s;
	border-style: none;

	&.disabled {
		background: #ffffff55;
		color: #c5c5c5;
		border: 1px solid #e5e5e5;
		cursor: inherit;
		// pointer-events: none;
	}

	&:not(.disabled) {
		cursor: pointer;

		&.primary {
			background: #2563ea;
			color: #fff;
			// border: 1px solid rgba(224, 226, 231, 0.56);

			// border-radius: 5px;
			// background-color: rgb(240 247 255);
			// font-weight: 300;
			// color: rgb(0 95 242 / .9);
			// border:1px solid rgb(203 231 255);
			// font-size: .85em;
		}

		&.secondary {
			// background: rgba(9,30,66,.08);
			background: color-mix(in srgb, currentcolor 7%, transparent);
			color: #344563;
			border: 1px solid transparent;
			border:1px solid color-mix(in srgb, currentcolor 12%, transparent);
		}
		&.light {
			color: #2563ea;
			background: color-mix(in srgb, currentcolor 10%, transparent);
		}
		&.ghost {
			background: transparent;
			color: #344563;
			border: 1px solid transparent;

			&:hover {
				opacity: 1; // перекрываем общий opacity: .8
				background: color-mix(in srgb, currentcolor 8%, transparent);
			}
		}
		&.subtle {
			color: #1d4ed8;
			background: color-mix(in srgb, currentcolor 8%, transparent);
			border: 1px solid color-mix(in srgb, currentcolor 20%, transparent);
		}
		&.link {
			background: transparent;
			color: #2563ea;
			padding-inline: 0;
			border: none;

			&:hover {
				opacity: 1;
				text-decoration: underline;
			}
		}

		&:hover {
			opacity:.8;
		}
	}


	.button-text {
		font-weight: 700;
		text-align: center;
    	flex: auto 1 1;

		&:empty {
			display: none;
		}
	}

	.loading-icon {
		animation: base-button-loading 1s linear infinite;
	}
}

@keyframes base-button-loading {
	from {
		transform: rotate(0deg);
	}

	to {
		transform: rotate(360deg);
	}
}
</style>
