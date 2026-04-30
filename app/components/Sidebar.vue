<template>
	<section class="sidebar">
		<ul class="links">
			<li
				v-for="link of links"
				:key="link.link ?? link.title ?? link.class"
				class="link"
			>
				<div v-if="link.spacer" :class="link.class">{{ link.title ?? '' }}</div>
				<template v-else>
					<NuxtLink
						:to="link.link"
						:class="['link-row', { 'active': isActiveLink(link), 'disabled': link.disabled }]"
						@click="handleDisabledLink(link, $event)"
					>
						<BaseIcon :name="link.icon!" size="20" style="margin-right:.6em;"/>
						{{ link.title }}
					</NuxtLink>
					<ul v-if="link.children?.length" class="children">
						<li
							v-for="child of link.children"
							:key="child.link ?? child.title"
							class="child-link"
						>
							<div v-if="child.spacer" :class="child.class">{{ child.title ?? '' }}</div>
							<NuxtLink v-else
								:to="child.link"
								:class="['link-row', { 'active': isActiveLink(child), 'disabled': child.disabled }]"
								@click="handleDisabledLink(child, $event)"
							>
								<BaseIcon :name="child.icon!" size="18" style="margin-right:.6em;"/>
								{{ child.title }}
							</NuxtLink>
						</li>
					</ul>
				</template>
			</li>
		</ul>
		<footer class="sidebar-footer">
			<span>Version: {{ version }}</span>
		</footer>
	</section>
</template>

<script lang="ts" setup>
import { version } from '../../package.json';
import BaseIcon from './common/base/BaseIcon.vue';

type SidebarLink = {
	title?: string
	link?: string
	icon?: string
	disabled?: boolean
	spacer?: boolean
	class?: string
	children?: SidebarLink[]
}

const route = useRoute();

const links = ref<SidebarLink[]>([
	{
		title: 'Панель управления',
		link: '/dashboard',
		icon: 'mdi-view-dashboard'
	},
	{
		title: 'Абоненты',
		link: '/clients',
		icon: 'mdi-account-group',
		disabled: true,
		children: [
			{
				title: 'Поиск абонентов',
				link: '/clients',
				icon: 'mdi-account-search',
				disabled: true
			},
			{
				title: 'Чат',
				link: '/chat',
				icon: 'mdi-chat',
				disabled: true,
				// Возможность переотправки сообщений
			},
			{
				title: 'Баланс',
				link: '/balance',
				icon: 'mdi-wallet',
				disabled: true
			}
		]
	},
		{
		title: 'Юрики',
		icon: 'mdi-scale-balance',
		disabled: true,
		children: [
			{
				title: 'Поиск абонентов',
				link: '/counterparty',
				icon: 'mdi-account-search',
				disabled: true
			},
			{
				spacer: true,
				class: 'splitter',
			},
			{
				title: 'Загрузка абонентов',
				link: '/counterparty/upload',
				icon: 'mdi-account-multiple-plus',
				// Возможность переотправки сообщений
			},
			{
				title: 'Загрузка балансов',
				link: '/counterparty/upload-balances',
				icon: 'mdi-wallet',
			},
			{
				title: 'Загрузка показаний',
				link: '/counterparty/upload-readings',
				icon: 'mdi-counter',
			}
		]
	},
	{
		title: 'Тарифы',
		link: '/tariffs',
		icon: 'mdi-currency-usd',
		disabled: true
	},
	{
		title: 'Массовая замена',
		link: '/meter-app/upload',
		icon: 'mdi-account-multiple'
	},
	{
		title: 'Онлайн квитанции',
		link: '/bills/upload',
		icon: 'mdi-invoice-text-multiple'
	},

	{
		title: 'Портал',
		link: '/portal',
		icon: 'mdi-web',
		disabled: true
	},

	{
		spacer: true,
		class: 'splitter',
	},
	{
		title: 'Маршруты',
		link: '/trips',
		icon: 'mdi-map-marker',
		disabled: true,
		// Возможность менять даты
		children: [
			{
				title: 'Изменить дату',
				link: '/trips/calendar',
				icon: 'mdi-calendar',
				disabled: true
			},
			{
				title: 'Назначить задачу',
				link: '/trips/assign',
				icon: 'mdi-account-check',
				disabled: true
			}
		]
	},

	{
		spacer: true,
		class: 'spacer',
	},
	{
		title: 'Настройки',
		link: '/settings',
		icon: 'mdi-cog',
		disabled: true
	},
	{
		title: 'Выход',
		link: '/logout',
		icon: 'mdi-logout',
		disabled: true
	}
]);

function isActiveLink(link: SidebarLink) {
	if( link.link && route.path === link.link ) return true;
	return Boolean(link.children?.some(isActiveLink));
}

function handleDisabledLink(link: SidebarLink, event: Event) {
	if( !link.disabled ) return;
	event.preventDefault();
}
</script>

<style lang="scss">
.sidebar {
	display: flex;
	flex-direction: column;
	background:#0e3896;
	color: #a9c0f6;
	max-width:50vw;

	.links {
		display: flex;
		flex-direction: column;
		flex: 1 1 auto;
		min-height: 0;
		box-sizing: border-box;
		list-style-type: none;
		margin:0;
		padding:1rem;

		.link {
			line-height: 3em;
			border-radius:7px;
			&:has(.spacer) {
				flex:auto 1 1;
			}
			.splitter {
				margin:.2em 0;
				border-bottom:1px dashed #5082ee66;
			}

			.link-row {
				display: block;
				color: inherit;
				text-decoration: none;
				font-size:1.1rem;
				padding:0 1em;

				&:hover,
				&.active {
					background:#124bc6;
					color:#ffffff;
					border-radius:7px;
				}

				&.disabled {
					color:#ffffff55;
					cursor: inherit;
					pointer-events: none;
				}
			}

			.children {
				list-style-type: none;
				margin:0;
				padding:0 0 .4em 1.9em;

				.child-link {
					line-height: 2.4em;
					border-radius:7px;

					.link-row {
						font-size:1rem;
						padding:0 1em;
					}
				}
			}
		}
	}

	.sidebar-footer {
		padding:1rem;
		font-size: .9rem;
		color:#ffffff22;
		text-align: center;
	}
}
</style>
