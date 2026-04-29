<template>
	<section class="sidebar-layout">
		<header class="sidebar-header" style="display:flex; align-items:center; gap:1em; padding:.5em 2em;">
			<section class="logo" style="display: flex; align-items:center; gap:.6em; margin-right:2em;">
				<img height="20px" src="/favicon.svg" alt="Логотип" />
				<h2>Internal Admin</h2>
			</section>
			<section class="search">
				<BaseTextBox ref="searchInput" placeholder="Поиск абонента по ФИО, лицевому счету" prependIcon="mdi-magnify" />
			</section>
			<section class="actions" style="flex:auto 1 0; display:flex; gap:.5em;">

			</section>
			<section style="display:flex; gap:1em;">
				<BaseIcon name="mdi-bell" size="20" style="color:#525252;"/>
				<BaseIcon name="mdi-help-circle-outline" size="20" style="color:#525252;"/>
				<BaseIcon name="mdi-cog" size="20" style="color:#525252;"/>
			</section>
			<section class="user-box" style="display:flex; align-items:center; gap:.5em;">
				<!-- <img src="/img/user-avatar.png" alt="Аватар пользователя" /> -->
				<div class="user-info" style="text-align:right;">
					<div class="name" style="color:#171717; font-size:.9rem; font-weight:700;">Admin</div>
					<div class="role" style="color:#737373; font-size:.8rem;">Администратор</div>
				</div>
				<div>
					<div style="background: #2563ea; color:#feffff; padding:.3em; border-radius:50%; font-weight: 700; line-height:2em; width:2em; aspect-ratio:1/1; text-align:center;">А</div>
				</div>
				<BaseIcon @click="logout" name="mdi-logout" size="20" style="color:#a3a3a3;"/>
			</section>
		</header>
		<main class="sidebar-main">
			<Sidebar v-resizeble="`right`"/>
			<section class="page-content">
				<slot/>
			</section>
		</main>
	</section>
</template>

<script lang="ts" setup>
import BaseButton from '~/components/common/base/BaseButton.vue';
import BaseIcon from '~/components/common/base/BaseIcon.vue';
import BaseTextBox from '~/components/common/base/BaseTextBox.vue';
import Sidebar from '~/components/Sidebar.vue';

const userStore = useUserStore();
const searchInput = ref<any>(null);
// if( !userStore.userData ) navigateTo('/login');

onMounted(() => {
	enableAutofocus();
});

function logout() {
	userStore.reset();
	navigateTo('/login');
}

function enableAutofocus() {
	window.addEventListener('keydown', (e) => {
		if( !searchInput.value ) return;
		const input = searchInput.value.$el.querySelector('input') as HTMLInputElement;

		// 1. Проверяем, что фокус НЕ в другом текстовом поле
		const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable;

		// 2. Игнорируем системные сочетания (Ctrl+C, Alt+Tab, F5 и т.д.)
		const isModifier = e.ctrlKey || e.metaKey || e.altKey;

		// 3. Проверяем, что нажата печатаемая клавиша (буква, цифра или спецсимвол)
		// В современных браузерах e.key.length === 1 гарантирует, что это символ
		if (!isInput && !isModifier && e.key.length === 1) {
			input.focus();
			// Фокус перейдет, но символ напечатается автоматически благодаря событию
		}

		// Дополнительно: очистка поиска по Escape
		if (e.key === 'Escape' && document.activeElement === input) {
			input.setAttribute('value', '');
			input.blur(); // Убираем фокус
		}
	});
}

</script>

<style lang="scss">
.sidebar-layout {
	min-height: 100dvh;
	display: flex;
	flex-direction: column;

	.sidebar-header {
		// занимает свою естественную высоту
		flex: 0 0 auto;
		background-color: #f6f7fb;
		border-bottom: 1px solid #e5e5e5;
	}

	.sidebar-main {
		// забирает остаток экрана
		display: flex;
		flex: 1 1 auto;
		min-height: 0; // можно быть меньше высоты собственного контента, если layout требует, позволяет дочерним элементам корректно обрабатывать overflow

		.page-content {
			flex: auto 1 1;
			overflow-y: auto;
			padding: 2em;
		}
	}
}
</style>
