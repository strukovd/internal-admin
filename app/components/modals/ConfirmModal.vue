<template>
	<div class="confirm-modal">
		<main v-if="payload" class="content">
			<h2 v-if="payload?.title" class="title">{{ payload.title }}</h2>
			<p v-if="payload.description" class="description">{{ payload.description }}</p>
		</main>
		<footer class="footer">
			<div class="buttons">
				<BaseButton prependIcon="mdi-check" @click="confirm" @keyup.enter="confirm">Да</BaseButton>
				<BaseButton prependIcon="mdi-close" @click="close" variant="secondary" @keyup.escape="close">Отмена</BaseButton>
			</div>
		</footer>
	</div>
</template>

<script lang="ts" setup>
import BaseButton from '../common/base/BaseButton.vue';

const props = defineProps({
	payload: Object
});

function confirm() {
	const appStore = useAppStore();
	if (appStore) {
		const modal = appStore.modals.pop();
		if(modal && modal.resolve) modal?.resolve(true);
	}
}

function close() {
	const appStore = useAppStore();
	if (appStore) {
		const modal = appStore.modals.pop();
		if(modal && modal.resolve) modal?.resolve(false);
	}
}
</script>

<style lang="scss">
.confirm-modal {
	.content {
		padding:0 0 1.6em 0;

		.title {
		padding:0 0 .2em 0;
		margin:0 0 .2em 0;
		font-weight: 300;
		line-height: 1.3em;
		text-align:center;
		border-bottom:1px solid #46587c25;
		}
		.description {
		color:#46587c;
		text-align:center;
		white-space: pre-wrap;
		}
	}
	.footer {
		.buttons {
		// margin:1.6em 0 0 0;
		display: flex;
		gap: .4em;
		justify-content: flex-end;
		}
	}
}
</style>