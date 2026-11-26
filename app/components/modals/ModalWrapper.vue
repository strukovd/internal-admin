<template>
	<div class="modal-shadow" @click.self="close">
		<Transition name="modal-loader">
			<div v-if="loading" class="modal-loader">
				<div class="modal-loader-pulse">
					<svg class="modal-loader-logo" xmlns="http://www.w3.org/2000/svg" viewBox="-0.11 -0.358 31.34 51.39" aria-hidden="true">
						<defs>
							<path
								id="modal-loader-shape"
								d="M17.9 33.109v5.47-.041a4.95 4.95 0 017.002 0 4.865 4.865 0 010 6.95l-.042.042-.04.041a10 10 0 01-6.962 2.838 9.89 9.89 0 01-7.002-2.88 9.746 9.746 0 01-1.202-12.42c.332-.535.746-.987 1.202-1.48a9.89 9.89 0 017.002-2.88V15.63C8.163 15.629.29 23.444.29 33.109s7.914 17.52 17.651 17.52c5.096 0 9.654-2.138 12.886-5.552V33.11zM28.465 9.172c-1.077-4.689-3.77-8.514-4.143-9.13-.58.863-2.735 4.235-3.854 7.978-1.201 4.154-1.367 7.856-.953 11.516s1.948 7.403 1.948 7.403c.829 1.975 2.072 4.072 2.859 5.1 1.16-1.521 3.895-6.045 4.723-11.968.498-3.332.498-6.21-.58-10.9M24.28 30.847c-.538-.987-1.367-2.88-1.45-5.8 0-2.837 1.119-5.223 1.45-5.757.29.493 1.285 2.59 1.41 5.51.123 2.839-.83 5.06-1.41 6.047m3.854-13.696c-.042 1.81-.249 3.701-.539 4.812.083-1.933-.124-4.689-.58-6.828-.456-2.138-1.74-5.716-2.735-7.403-.953 1.563-2.113 4.689-2.693 7.362-.621 2.674-.621 5.964-.621 6.91-.166-.823-.58-3.743-.456-6.704.083-2.427.663-4.936.994-6.087 1.202-3.825 2.57-6.293 2.818-6.704.248.37 1.947 3.414 2.859 6.58.828 3.209.994 6.252.953 8.062"
							/>
						</defs>
						<use class="modal-loader-shape mls-back" href="#modal-loader-shape"></use>
						<use class="modal-loader-shape mls-middle" href="#modal-loader-shape"></use>
						<use class="modal-loader-shape mls-front" href="#modal-loader-shape"></use>
					</svg>
				</div>
			</div>
		</Transition>

		<Transition name="modal-window">
			<div v-if="modalComponent && !loading" class="modal-window">
				<header v-if="visibleModal.options?.title" class="modal-header">
					<h3 class="modal-title">
						<!-- TODO: <v-icon v-if="visibleModal.options?.icon" color="cornflowerblue" :icon="visibleModal.options?.icon" size="1.2em"/> -->
						<span class="modal-title-text">{{ visibleModal.options.title }}</span>
					</h3>
				</header>
				<main class="main">
					<component :is="modalComponent" :payload="visibleModal.options?.payload"></component>
				</main>
			</div>
		</Transition>
	</div>
</template>

<script lang="ts" setup>
import type { Component } from 'vue';

const appStore = useAppStore();
const visibleModal: any = computed(() => appStore.modals[appStore.modals.length-1] ?? {});
const modalLoaders = import.meta.glob('./*.vue');
const modalComponentCache = new Map<string, Component>();
const modalComponent = shallowRef<Component | null>(null);
const loading = ref(false);

async function loadModalComponent(template?: string) {
	if (!template) return null;
	const cached = modalComponentCache.get(template);
	if (cached) return cached;

	const candidates = [
		`./${template}.vue`,
		`./${template}Modal.vue`
	];
	const loaderKey = candidates.find((candidate) => candidate in modalLoaders);
	if (!loaderKey) return null;

	const loaded = await (modalLoaders[loaderKey] as () => Promise<{ default: Component }>)();
	const component = loaded.default;
	modalComponentCache.set(template, component);
	return component;
}

// Триггер загрузки модалок
watch(() => visibleModal.value?.template, async (template) => {
	modalComponent.value = null;
	if (!template) { // если шаблон не указан
		loading.value = false;
		return;
	}

	// пытаемся найти модалку в кэше
	const cached = modalComponentCache.get(template);
	if (cached) { // если в кэше нашли, используем её
		modalComponent.value = cached;
		loading.value = false;
		return;
	}

	loading.value = true;
	const component = await loadModalComponent(template);

	if (template !== visibleModal.value?.template) return;

	modalComponent.value = component;
	loading.value = false;
}, { immediate: true });

// Блокировка прокрутки страницы под модалкой
watch(() => appStore.modals.length, (length) => {
	if (!import.meta.client) return;
	document.body.classList.toggle('lock-scroll', length > 0);
}, { immediate: true });

function onKeydown(e: KeyboardEvent) {
	if( e.key === 'Escape' ) {
		close();
	}
}

function close() {
	if( !visibleModal.value?.options?.nonCloseable ) {
		const modal = appStore.modals.pop();
		modal?.resolve?.(false);
	}
}

onMounted(() => {
	window.addEventListener('keydown', onKeydown);
});
onBeforeUnmount(() => {
	window.removeEventListener('keydown', onKeydown);
	document.body.classList.remove('lock-scroll');
});
</script>

<style lang="scss">
.modal-shadow {
	position: fixed;
	top: 0;
	right: 0;
	left: 0;
	bottom: 0;
	height:100vh;
	display: grid;
	place-items: center;
	overscroll-behavior: contain;
	transition:background-color 200ms ease-out 0s;
	background-color: rgb(20 33 51 / 30%);
	z-index:1000;

	.modal-loader {
		display: grid;
		place-items: center;
		grid-area: 1 / 1;
		width: 8em;
		height: 8em;
		border-radius: 50%;
		// background: rgb(255 255 255 / 78%);
		// box-shadow: 0 24px 70px rgb(16 24 40 / 18%);
		// backdrop-filter: blur(10px);

		.modal-loader-pulse {
			position: relative;
			width: 4.7em;
			height: 4.7em;

			.modal-loader-logo {
				position: absolute;
				inset: 0;
				overflow: visible;

				.modal-loader-shape {
					fill: rgba(255 255 255 / 6%);
					stroke: rgba(255 255 255 / 80%);
					stroke-width: .55;
					stroke-linecap: round;
					stroke-linejoin: round;
					stroke-dasharray: 180;
					stroke-dashoffset: 180;
					transform-box: fill-box;
					transform-origin: center;
					animation: modalStrokePulse 1.55s ease-out infinite;

					&.mls-middle {
						stroke: rgba(255 255 255 / 55%);
						animation-delay: .25s;
					}

					&.mls-front {
						fill: rgba(255 255 255 / 18%);
						stroke: rgba(255 255 255 / 35%);
						animation-delay: .5s;
					}
				}
			}
		}
	}

	.modal-window {
		background-color: #ffffff;
		min-width:600px;
		max-width: 800px;
		grid-area: 1 / 1;
		// background: white;
		border-radius:6px;

		.modal-header {
			border-radius:6px 6px 0 0;
			// color: #656565;
			border-bottom: 1px solid #ffffff30;
			// background: #f5f5f5;

			.modal-title {
				line-height: 3em;
				margin: 0 1em;
				font-size: 1.2em;

				.modal-title-text {
					vertical-align:middle;
					margin-left:.6em;
				}
			}
		}

		>.main {
			padding:.6em 1.8em 1em;
			// overflow: auto;
			max-height: 90vh;
		}
	}
}

body.lock-scroll {
	overflow: hidden;
}

.modal-loader-enter-active,
.modal-loader-leave-active {
	transition: opacity 180ms ease, transform 180ms ease;
}

.modal-loader-enter-from,
.modal-loader-leave-to {
	opacity: 0;
	transform: scale(.92);
}

.modal-window-enter-active,
.modal-window-leave-active {
	transition: opacity 180ms ease, transform 180ms ease;
}

.modal-window-enter-from,
.modal-window-leave-to {
	opacity: 0;
	transform: translateY(.4em) scale(.98);
}

@keyframes modalStrokePulse {
	0% {
		opacity: 0;
		stroke-dashoffset: 180;
		transform: scale(.88);
	}

	35% {
		opacity: .9;
		stroke-dashoffset: 0;
		transform: scale(.98);
	}

	100% {
		opacity: 0;
		stroke-dashoffset: -180;
		transform: scale(1.12);
	}
}
</style>
