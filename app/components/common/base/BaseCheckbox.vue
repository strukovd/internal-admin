<template>
	<label class="base-checkbox" :class="{ checked: modelValue, disabled }" :style="{ '--base-checkbox-color': color }">
		<input :id="id" :name="name" type="checkbox" :checked="modelValue" :disabled="disabled" @change="onChange">
		<span class="checkbox-control">
			<BaseIcon v-if="modelValue" name="mdi-check" size="1em"></BaseIcon>
		</span>
		<span v-if="caption" class="checkbox-caption">{{ caption }}</span>
	</label>
</template>

<script lang="ts" setup>
import BaseIcon from './BaseIcon.vue';

const emit = defineEmits(['update:modelValue']);
const props = defineProps({
	id: String,
	modelValue: { type: Boolean, default: false },
	name: String,
	label: String,
	disabled: { type: Boolean, default: false },
	color: String
});

const caption = computed(() => props.label ?? props.name);

function onChange(event: Event) {
	emit('update:modelValue', (event.target as HTMLInputElement).checked);
}
</script>

<style lang="scss">
.base-checkbox {
	--base-checkbox-color: #525252; // #2563ea;

	display: inline-flex;
	align-items: center;
	gap: .55em;
	width: fit-content;
	// color: #344563;
	font-size: .9em;
	line-height: 1.4em;
	user-select: none;
	cursor: pointer;

	&>input {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		padding: 0;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	&.disabled {
		color: #a3a3a3;
		cursor: inherit;
		pointer-events: none;
	}

	.checkbox-control {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: 0 0 1.15em;
		width: 1.15em;
		height: 1.15em;
		box-sizing: border-box;
		color: #fff;
		background: #fff;
		border: 1px solid #cbd5e1;
		border-radius: 4px;
		transition: all 200ms ease 0s;
	}

	.checkbox-caption {
		font-weight: 300;
		white-space: nowrap;
		text-wrap: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	&.checked {
		.checkbox-control {
			background: var(--base-checkbox-color);
			border-color: var(--base-checkbox-color);
		}
	}

	&.disabled {
		.checkbox-control {
			background: #f5f5f5;
			border-color: #e5e5e5;
			color: #c5c5c5;
		}
	}

	&:not(.disabled) {
		&:hover {
			.checkbox-control {
				border-color: var(--base-checkbox-color);
			}
		}

		&>input:focus-visible+.checkbox-control {
			border-color: var(--base-checkbox-color);
			box-shadow: 0 0 0 2px color-mix(in srgb, var(--base-checkbox-color) 35%, transparent);
		}
	}
}
</style>
