<template>
	<nav aria-label="breadcrumb">
		<ol class="base-breadcrumb">
			<li class="breadcrumb-item" v-for="(item, index) of breadcrumbs" :key="index">
				<span v-if="item.disabled || !item.link || index === breadcrumbs.length-1" aria-current="page">{{ item.title }}</span>
				<NuxtLink v-else :to="item.link">{{ item.title }}</NuxtLink>
			</li>
		</ol>
	</nav>
</template>

<script lang="ts" setup>
export type BreadcrumbPropModel = {
	title: string,
	link?: string,
	disabled?: boolean,
}
const props = defineProps({
	breadcrumbs: { type: Array as () => Array<BreadcrumbPropModel>, default: () => [{ link: '/', title: 'Главная' }] },
})
</script>

<style lang="scss">
.base-breadcrumb {
	display: flex;
	align-items: center;
	color: #737373;
	font-weight: 300;
	font-size: .9rem;
	padding: 0;

	li {
		display: flex;
		align-items: center;

		&:not(:last-child) {
			&::after {
				content: '/';
				color: #a3a3a3;
				width: 7px;
				margin:auto .7em;
			}
		}

		&:last-child {
			color: #404040;
			font-weight:700;
		}

		a {
			color: #2065E6;
			text-decoration: none;
		}
	}
}
</style>
