<template>
	<div :class="['user-picker', { invalid: error, disabled }]">
		<header v-if="label || error" class="up-header">
			<span v-if="label" class="up-label">{{ label }}</span>
			<span v-if="error" class="up-error">{{ error }}</span>
		</header>

		<div class="up-control" @mousedown="open">
			<!-- Выбранный пользователь показывается карточкой; клик - поиск другого -->
			<div v-if="selected && !focused" class="up-selected">
				<span class="up-avatar">{{ initials(selected.name) }}</span>
				<span class="up-name">{{ selected.name }}</span>
				<span class="up-username">{{ selected.username }}</span>
			</div>
			<template v-else>
				<BaseIcon name="mdi-account-search-outline" class="up-icon"/>
				<input
					ref="inputEl"
					v-model="search"
					class="up-input"
					type="text"
					:placeholder="selected?.name ?? placeholder"
					:disabled="disabled"
					@blur="onBlur"
					@input="onInput"
					@keydown="onKeydown"
				>
			</template>
			<BaseIcon v-if="loading" name="mdi-loading" class="up-icon up-loading"/>
			<BaseIcon v-else-if="selected && !disabled" name="mdi-close" class="up-icon up-clear" @mousedown.prevent.stop="select(null)"/>
		</div>

		<ul v-if="focused" class="up-list">
			<li
				v-for="(item, index) of items"
				:key="item.id"
				:class="['up-item', { active: activeIndex === index }]"
				@mousedown.prevent="select(item)"
				@mouseenter="activeIndex = index"
			>
				<span class="up-avatar">{{ initials(item.name) }}</span>
				<div class="up-item-content">
					<div class="up-item-topline">
						<span class="up-name">{{ item.name }}</span>
						<span class="up-username">{{ item.username }}</span>
					</div>
					<div class="up-item-sub">
						{{ item.position || 'Должность не указана' }}
						<span v-if="!item.isActive" class="up-blocked">заблокирован</span>
					</div>
				</div>
			</li>
			<li v-if="!items.length" class="up-empty">
				<BaseIcon name="mdi-account-search-outline" size="20"/>
				<span>{{ loading ? 'Поиск...' : 'Никого не найдено' }}</span>
			</li>
		</ul>
	</div>
</template>

<script lang="ts" setup>
import BaseIcon from './common/base/BaseIcon.vue';
import { useAccessStore, type AccessUser } from '~/stores/AccessStore';

/**
 * Выбор пользователя auth-handler с поиском по логину и имени (users.list?find=).
 * v-model - id пользователя; полный объект приходит в @select.
 * Пользователей немного, поэтому при открытии сразу показываем первые, без минимальной длины запроса.
 */
const props = withDefaults(defineProps<{
	modelValue?: number | null;
	label?: string;
	placeholder?: string;
	error?: string;
	disabled?: boolean;
	/** Кого нельзя выбрать, напр. самого пользователя в поле «Руководитель» */
	excludeIds?: number[];
}>(), {
	placeholder: 'Логин или имя',
	excludeIds: () => [],
});

const emit = defineEmits<{
	'update:modelValue': [value: number | null];
	'select': [value: AccessUser | null];
}>();

const access = useAccessStore();
const search = ref('');
const items = ref<AccessUser[]>([]);
const selected = ref<AccessUser | null>(null);
const focused = ref(false);
const loading = ref(false);
const activeIndex = ref(-1);
const inputEl = ref<HTMLInputElement | null>(null);
let timer: ReturnType<typeof setTimeout> | null = null;

// Снаружи пришёл только id - подгружаем пользователя, чтобы показать имя
watch(() => props.modelValue, async (id) => {
	if(!id) {
		selected.value = null;
		return;
	}
	if(selected.value?.id === id) return;
	const page = await access.listUsers({ ids: [id], size: 1 });
	selected.value = page.content[0] ?? null;
}, { immediate: true });

async function fetchItems() {
	loading.value = true;
	try {
		const page = await access.listUsers({ find: search.value.trim() || undefined, size: 10 + props.excludeIds.length });
		items.value = page.content.filter(user => !props.excludeIds.includes(user.id)).slice(0, 10);
		activeIndex.value = items.value.length ? 0 : -1;
	}
	catch {
		items.value = [];
	}
	finally {
		loading.value = false;
	}
}

function open() {
	if(props.disabled || focused.value) return;
	focused.value = true;
	search.value = '';
	nextTick(() => inputEl.value?.focus());
	fetchItems();
}

function onInput() {
	if(timer) clearTimeout(timer);
	timer = setTimeout(fetchItems, 250);
}

function select(user: AccessUser | null) {
	selected.value = user;
	focused.value = false;
	emit('update:modelValue', user?.id ?? null);
	emit('select', user);
}

function initials(name: string) {
	return name.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
}

function onKeydown(event: KeyboardEvent) {
	if(event.key === 'ArrowDown' || event.key === 'ArrowUp') {
		event.preventDefault();
		if(!items.value.length) return;
		const step = event.key === 'ArrowDown' ? 1 : -1;
		activeIndex.value = (activeIndex.value + step + items.value.length) % items.value.length;
	}
	else if(event.key === 'Enter') {
		event.preventDefault();
		if(items.value[activeIndex.value]) select(items.value[activeIndex.value]!);
	}
	else if(event.key === 'Escape') {
		// Не даём закрыться модалке, пока открыт список
		event.stopPropagation();
		inputEl.value?.blur();
	}
}

function onBlur() {
	// Задержка: иначе список скроется раньше, чем сработает клик по пункту
	setTimeout(() => focused.value = false, 120);
}
</script>

<style lang="scss">
.user-picker {
	position: relative;

	.up-header {
		display: flex;
		justify-content: space-between;
		gap: 1em;
		margin-bottom: .4em;
		font-size: 14px;
		line-height: 1.4em;

		.up-label {
			opacity: .6;
		}

		.up-error {
			color: red;
			opacity: .6;
		}
	}

	.up-avatar {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 0 0 auto;
		width: 1.9em;
		height: 1.9em;
		border-radius: 50%;
		background: #e9effd;
		color: #2563ea;
		font-size: .8rem;
		font-weight: 700;
	}

	.up-name {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		font-weight: 600;
	}

	.up-username {
		flex: 0 0 auto;
		color: #2563ea;
		font-size: .8em;
	}

	.up-control {
		display: flex;
		align-items: center;
		gap: .45em;
		min-height: 2.6em;
		padding: .2em .55em;
		box-sizing: border-box;
		border: 1px solid #d4d4d4;
		border-radius: 6px;
		background: #fff;
		cursor: text;

		.up-selected {
			display: flex;
			align-items: center;
			gap: .6em;
			flex: 1 1 auto;
			min-width: 0;
			cursor: pointer;
		}

		.up-input {
			flex: 1 1 auto;
			min-width: 0;
			padding: .4em .2em;
			border: 0;
			outline: 0;
			background: transparent;
			font: inherit;

			&::placeholder {
				color: #95a3b8;
				font-weight: 300;
			}
		}

		.up-icon {
			color: #8b95a5;

			&.up-clear {
				cursor: pointer;

				&:hover {
					color: #525252;
				}
			}

			&.up-loading {
				animation: user-picker-spin 900ms linear infinite;
			}
		}

		&:focus-within {
			box-shadow: 0 0 0 2px #0079C1aa;
		}
	}

	.up-list {
		position: absolute;
		top: calc(100% + .3em);
		left: 0;
		right: 0;
		z-index: 20;
		max-height: 320px;
		margin: 0;
		padding: .35em;
		box-sizing: border-box;
		overflow-x: hidden;
		overflow-y: auto;
		list-style: none;
		border: 1px solid #dbe2ea;
		border-radius: 8px;
		background: #fff;
		box-shadow: 0 14px 40px rgb(15 23 42 / 14%);

		.up-item {
			display: flex;
			align-items: center;
			gap: .65em;
			padding: .55em;
			border-radius: 6px;
			cursor: pointer;

			.up-item-content {
				flex: 1 1 auto;
				min-width: 0;

				.up-item-topline {
					display: flex;
					align-items: baseline;
					justify-content: space-between;
					gap: .7em;
				}

				.up-item-sub {
					margin-top: .15em;
					color: #737373;
					font-size: .8rem;

					.up-blocked {
						margin-left: .4em;
						color: #d32f2f;
					}
				}
			}

			&.active {
				background: #eef5ff;
			}
		}

		.up-empty {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: .4em;
			padding: .8em 0;
			color: #737373;
		}
	}

	&.invalid .up-control {
		border-color: red;
		border-style: dashed;
	}

	&.disabled .up-control {
		background: #f5f5f5;
		cursor: default;

		.up-selected {
			cursor: default;
		}
	}
}

@keyframes user-picker-spin {
	from {
		transform: rotate(0deg);
	}

	to {
		transform: rotate(360deg);
	}
}
</style>
