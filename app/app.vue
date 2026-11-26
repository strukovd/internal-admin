<template>
  <div>
	<NuxtLayout>
		<NuxtPage/>
	</NuxtLayout>
	<ModalWrapper v-if="appStore.modals.length"/>
  </div>
</template>

<script lang="ts" setup>
import ModalWrapper from './components/modals/ModalWrapper.vue';

const appStore = useAppStore();
</script>

<style>
body {
	margin:0;
}

h1 {
	font-size:36px;
}
</style>
