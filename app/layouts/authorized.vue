<template>
  <section class="authorized-layout">
	<header>
		<div class="userbox">
			<div>
				<div class="login"><b>{{ userStore.userData.login }}</b></div>
				<div>{{ userStore.userData.contractorName }}</div>
			</div>
			<BaseButton @click="logout" variant="secondary">Выйти</BaseButton>
		</div>
	</header>
    <slot />
  </section>
</template>

<script lang="ts" setup>
import BaseButton from '~/components/common/base/BaseButton.vue';

const userStore = useUserStore();
if( !userStore.userData ) navigateTo('/login');

function logout() {
	userStore.reset();
	navigateTo('/login');
}

</script>

<style lang="scss">
.authorized-layout {
	header {
		display: flex;
		flex-direction: column;
		align-items: end;
		background-color:#ffffff;

		.userbox {
			display: flex;
			flex-direction: row;
			align-items: center;
			gap:1.2em;
			font-size:12px;
			padding:.6em;
			text-align:center;
			line-height:1.6em;

			.login {
				font-size:1.2em;
			}
		}
	}
}
</style>
