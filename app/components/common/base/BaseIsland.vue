<template>
	<div class="base-island">
		<h4 v-if="title" class="bi-title">
			<BaseIcon v-if="prependIcon" :name="prependIcon" size="1.2em" style="margin-right:.4em; opacity:.7;"></BaseIcon>
			<span>{{ title }}</span>
		</h4>
		<div class="content">
			<slot name="default"></slot>
		</div>
	</div>
</template>

<script lang="ts" setup>
import BaseIcon from './BaseIcon.vue';

const props = defineProps({
	title: String,
	prependIcon: String
});
</script>

<style lang="scss">
.base-island {
	background-color:#ffffff;
	border:1px solid #e5e5e5;
	padding:1.6em;
	margin-top:1em;
	border-radius:12px;
	
	&:not(:last-child) {
		margin-bottom: 1.6em;
	}

	.bi-title {
		color: #172b4d;
		font-weight: 700;
		margin-bottom: 1em;
		background: #fdfdfd;
		border-radius: 5px;
		// border: 1px solid #f0f0f0;
		padding:.2em 0;
	}

	>.content {
		// background-color: #fdfdfd;
		// padding:1.6em;
		// border-radius:6px;
		// border:1px solid #f3f3f3;
	}
}
</style>