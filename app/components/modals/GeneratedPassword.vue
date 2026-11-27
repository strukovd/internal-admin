<template>
	<div class="generated-password-modal">
		<!-- Пароль показывается один раз: сервер его не хранит в открытом виде -->
		<p class="gpm-text">Пароль для <b>{{ payload.username }}</b> показан один раз, передайте его пользователю:</p>
		<code class="gpm-code">{{ payload.password }}</code>

		<footer class="gpm-footer">
			<BaseButton variant="secondary" prependIcon="mdi-content-copy" @click="copy">{{ copied ? 'Скопировано' : 'Копировать' }}</BaseButton>
			<BaseButton prependIcon="mdi-check" @click="close">Готово</BaseButton>
		</footer>
	</div>
</template>

<script lang="ts" setup>
import BaseButton from '~/components/common/base/BaseButton.vue';

const props = defineProps<{
	payload: { username: string; password: string };
}>();

const copied = ref(false);

async function copy() {
	await navigator.clipboard?.writeText(props.payload.password);
	copied.value = true;
}

function close() {
	useAppStore().modals.pop()?.resolve?.(true);
}
</script>

<style lang="scss">
.generated-password-modal {
	display: flex;
	flex-direction: column;
	gap: 1em;

	.gpm-text {
		margin: 0;
	}

	.gpm-code {
		align-self: flex-start;
		padding: .3em .8em;
		border-radius: 6px;
		background: #f1f5f9;
		font-size: 1.1em;
		letter-spacing: .05em;
	}

	.gpm-footer {
		display: flex;
		justify-content: flex-end;
		gap: .7em;
	}
}
</style>
