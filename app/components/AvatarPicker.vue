<template>
	<div :class="['avatar-picker', { invalid: errorText, disabled }]">
		<div
			:class="['ap-image', { dragover }]"
			title="Выбрать фото"
			@click="openDialog"
			@dragover.prevent="dragover = !disabled"
			@dragleave="dragover = false"
			@drop.prevent="onDrop"
		>
			<img v-if="previewUrl" :src="previewUrl" class="ap-img" alt="" @error="previewFailed = true">
			<span v-else class="ap-initials">{{ initials || '?' }}</span>
			<div v-if="!disabled" class="ap-overlay">
				<BaseIcon name="mdi-camera" size="1.6em"/>
			</div>
		</div>

		<div class="ap-side">
			<span v-if="label" class="ap-label">{{ label }}</span>
			<div v-if="!disabled" class="ap-actions">
				<BaseButton variant="secondary" prependIcon="mdi-image-plus" @click="openDialog">{{ previewUrl ? 'Заменить' : 'Выбрать' }}</BaseButton>
				<BaseButton v-if="previewUrl" variant="light" prependIcon="mdi-delete-outline" @click="clear">Убрать</BaseButton>
			</div>
			<span v-if="errorText" class="ap-error">{{ errorText }}</span>
			<span v-else class="ap-hint">JPG, PNG или WebP, до {{ maxSizeMb }} МБ. Можно перетащить на картинку.</span>
		</div>

		<input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" class="ap-input" @change="onInputChange">
	</div>
</template>

<script lang="ts" setup>
import BaseButton from './common/base/BaseButton.vue';
import BaseIcon from './common/base/BaseIcon.vue';

/**
 * Выбор аватара: превью, выбор файла кликом или перетаскиванием, удаление.
 * v-model - ссылка на сохранённый аватар (users.avatar: путь или URL), null - нет аватара.
 * Выбранный файл компонент не загружает: отдаёт его в @file, загрузку делает владелец формы при сохранении
 * (хранилище файлов ещё не выбрано). До загрузки показывается локальное превью.
 */
const props = withDefaults(defineProps<{
	modelValue?: string | null;
	/** Для заглушки без фото: инициалы из имени */
	name?: string;
	label?: string;
	error?: string;
	disabled?: boolean;
	maxSizeMb?: number;
}>(), {
	maxSizeMb: 2,
});

const emit = defineEmits<{
	'update:modelValue': [value: string | null];
	/** Новый файл для загрузки; null - файл отменён (аватар убран) */
	'file': [file: File | null];
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const localUrl = ref<string | null>(null);
const localError = ref('');
const dragover = ref(false);
const previewFailed = ref(false);

const previewUrl = computed(() => localUrl.value ?? (previewFailed.value ? null : props.modelValue) ?? null);
const errorText = computed(() => localError.value || props.error);
const initials = computed(() => (props.name ?? '').trim().split(/\s+/).slice(0, 2).map(word => word[0] ?? '').join('').toUpperCase());

// Пришла другая ссылка снаружи - снова пробуем её показать
watch(() => props.modelValue, () => previewFailed.value = false);

onBeforeUnmount(revokeLocal);

function openDialog() {
	if(props.disabled) return;
	fileInput.value?.click();
}

function onInputChange(event: Event) {
	const input = event.target as HTMLInputElement;
	pick(input.files?.[0]);
	input.value = ''; // иначе повторный выбор того же файла не вызовет change
}

function onDrop(event: DragEvent) {
	dragover.value = false;
	if(props.disabled) return;
	pick(event.dataTransfer?.files[0]);
}

function pick(file: File | undefined) {
	if(!file) return;
	if(!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
		localError.value = 'Нужна картинка JPG, PNG или WebP';
		return;
	}
	if(file.size > props.maxSizeMb * 1024 * 1024) {
		localError.value = `Файл больше ${props.maxSizeMb} МБ`;
		return;
	}
	localError.value = '';
	revokeLocal();
	localUrl.value = URL.createObjectURL(file);
	emit('file', file);
}

function clear() {
	revokeLocal();
	localError.value = '';
	emit('update:modelValue', null);
	emit('file', null);
}

function revokeLocal() {
	if(localUrl.value) URL.revokeObjectURL(localUrl.value);
	localUrl.value = null;
}
</script>

<style lang="scss">
.avatar-picker {
	display: flex;
	align-items: center;
	gap: 1.2em;

	.ap-image {
		position: relative;
		flex: 0 0 auto;
		width: 88px;
		height: 88px;
		overflow: hidden;
		border-radius: 50%;
		background: #e9effd;
		color: #2563ea;
		cursor: pointer;

		.ap-img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}

		.ap-initials {
			display: flex;
			align-items: center;
			justify-content: center;
			height: 100%;
			font-size: 1.8rem;
			font-weight: 700;
		}

		.ap-overlay {
			position: absolute;
			inset: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			background: rgb(15 23 42 / 45%);
			color: #fff;
			opacity: 0;
			transition: opacity 150ms ease;
		}

		&:hover .ap-overlay,
		&.dragover .ap-overlay {
			opacity: 1;
		}

		&.dragover {
			box-shadow: 0 0 0 3px #2563ea80;
		}
	}

	.ap-side {
		display: flex;
		flex-direction: column;
		gap: .5em;
		min-width: 0;

		.ap-label {
			font-size: 14px;
			opacity: .6;
		}

		.ap-actions {
			display: flex;
			gap: .5em;
		}

		.ap-hint {
			color: #737373;
			font-size: .8rem;
		}

		.ap-error {
			color: #d32f2f;
			font-size: .8rem;
		}
	}

	.ap-input {
		display: none;
	}

	&.invalid .ap-image {
		box-shadow: 0 0 0 2px #d32f2f80;
	}

	&.disabled .ap-image {
		cursor: default;
	}
}
</style>
