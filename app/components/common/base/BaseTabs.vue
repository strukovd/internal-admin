<template>
	<section class="tabs">
		<button type="button" class="tab-button"
			v-for="button of items" :key="button.key"
			:id="`tab-${button.key}`"
			:class="{selected: modelValue === button.key}"
			:style="{background: modelValue === button.key && button.color ? button.color : ''}"
			@click="onSelected(button.key)"
		>
			<BaseIcon v-if="button.icon" :name="button.icon" size="1.2em" style="margin-right:.2em; opacity:.8; vertical-align:baseline;"></BaseIcon>
			<span style="font-weight:300;">{{ button.caption }}</span>
			<div class="error-counter" v-if="button.badge">{{ button.badge }}</div>
		</button>
	</section>
</template>

<script lang="ts">
import BaseIcon from './BaseIcon.vue';

type TabModel = {
	key: any;
	icon?: string;
	caption: string;
	color?: string;
	badge?: string;
}

export default defineComponent({
	name: 'FilterTabs',
	components: { BaseIcon },
	props: {
		modelValue: { type: [Object, String, Number], default: undefined },
		items: Array as () => Array<TabModel>,
		autoselect: { type: Boolean, default: false }
	},
	emits: [ 'update:modelValue' ],
	data() {
		return {
			selectedKey: null as any,
		};
	},
	watch: {
		items() {
			if( !this.modelValue ) {
				// Выбираем первый элемент, если включено autoselect
				if(this.autoselect && !this.selectedKey && this.items?.length) {
					this.selectedKey = this.items[0].key;
				}
			}
		},

		selectedKey() {
			// Когда происходит автовыбор, вызывает явно onSelected
			this.onSelected(this.selectedKey);
		}
	},
	beforeMount() {
		// Выбираем первый элемент, если включено autoselect
		if(this.autoselect && this.items?.length) {
			this.selectedKey = this.items[0].key;
		}
	},
	methods: {
		onSelected(selectedKey: any) {
			this.selectedKey = selectedKey;
			this.$emit('update:modelValue', this.selectedKey);
		}
	},
});
</script>

<style lang="scss">
.tabs {
	display: flex;
	justify-content: center;
	align-items: center;
	margin: 0 0 0.6em 0;
	padding:.5em .7em;
	background: #FFFFFF;
	backdrop-filter: blur(20px);
	// box-shadow: 0px 0px 30px rgba(3, 100, 165, 0.1);
	box-shadow: 0 0 3px rgba(0 0 0 / .12);
	border-radius: 6px;
	// border: 1px solid #E0E2E791;

	.tab-button {
		flex:auto 1 1;
		position:relative;
		line-height:1.4em;
		margin:0 .1em;
		// background: #EBF1FF;
		// color: #0079C1;
		font-size: .9em;
		font-weight: 500;
		border-radius: 4px;
		box-shadow: none;
		padding:.4em 1em;
		transition:all 300ms ease 0s;
		background-color: transparent;
		border-style: none;
		cursor: pointer;

		&.selected {
			background: #0079C1;
			color: #fff !important;

			&:hover {
				background: #0079C1;
			}
		}

		.error-counter {
			position: absolute;
			display: inline-block;
			top: -.5em;
			right: -.5em;
			color: whitesmoke;
			background: red;
			padding: 0 .8em;
			line-height: 1.7em;
			border-radius: 10px;
			font-size: .7em;
		}
	}

}
</style>
