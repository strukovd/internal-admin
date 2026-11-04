<template>
	<section class="route-replacement">
		<BaseBreadcrumbs :breadcrumbs="[{ title: 'Главная', link: '/' }, { title: 'Маршруты' }, { title: 'Переназначение' }]"/>
		<div class="rr-header">
			<h1 class="rr-title">Переназначение маршрутов</h1>
			<p class="rr-description">Передайте назначения от одного сотрудника другому при увольнении или смене должности.</p>
		</div>

		<div class="rr-layout">
			<BaseIsland title="Параметры переноса" prependIcon="mdi-account-switch-outline">
				<form class="rr-form" @submit.prevent="reviewReplacement">
					<fieldset class="rr-fields" :disabled="isReviewing || isSubmitting">
						<div class="rr-people">
							<div class="rr-person">
								<div class="rr-step">1. От кого передать</div>
								<BaseTextBox v-model="form.oldJiraLogin" label="Jira-логин текущего сотрудника" placeholder="Например, ormushev" :error="errors.oldJiraLogin"/>
							</div>
							<BaseIcon class="rr-direction" name="mdi-arrow-right" size="26"/>
							<div class="rr-person">
								<div class="rr-step">2. Кому передать</div>
								<BaseTextBox v-model="form.newJiraLogin" label="Jira-логин нового сотрудника" placeholder="Например, Musurov.SM" :error="errors.newJiraLogin"/>
							</div>
						</div>
						<div class="rr-scope">
							<div class="rr-role">
								<BaseAutocomplete v-model="form.role" label="Роль (необязательно)" :items="roleOptions" :error="errors.role"/>
								<p class="rr-hint">Можно ограничить перенос ролью ORPSD или SOVGO.</p>
							</div>
							<div class="rr-legacy">
								<BaseCheckbox v-model="form.withOldSystem" label="Переносить маршруты также в старой системе"/>
							</div>
						</div>
						<div class="rr-methods">
							<div class="rr-step">3. Как перенести исполнителей</div>
							<BaseAutocomplete autoselect v-model="form.replaceAssigneeType" label="Способ переноса" :items="methodOptions" :error="errors.replaceAssigneeType" placeholder="Выберите вариант"/>
							<p v-if="selectedMethod" class="rr-method-description">{{ selectedMethod.description }}</p>
						</div>
					</fieldset>

					<div v-if="isReviewing" class="rr-review" role="status">
						<strong class="rr-review-title">Проверьте перед подтверждением</strong>
						<p class="rr-review-description">{{ form.oldJiraLogin.trim() }} → {{ form.newJiraLogin.trim() }}. Роль: {{ selectedRole?.value }}. Способ: {{ selectedMethod?.title.toLowerCase() }}.</p>
						<p class="rr-hint">{{ selectedMethod?.description }} Маршруты в старой системе: {{ form.withOldSystem ? 'тоже перенести' : 'не переносить' }}.</p>
					</div>
					<div v-if="submitSuccess" class="rr-result" role="status">{{ submitSuccess }}</div>
					<div v-if="submitError" class="rr-submit-error" role="alert">{{ submitError }}</div>
					<div class="rr-actions">
						<template v-if="isReviewing">
							<BaseButton prependIcon="mdi-check" :disabled="isSubmitting" @click="submitReplacement">{{ isSubmitting ? 'Переназначение...' : 'Подтвердить переназначение' }}</BaseButton>
							<BaseButton variant="secondary" :disabled="isSubmitting" @click="isReviewing = false">Изменить параметры</BaseButton>
						</template>
						<BaseButton v-else prependIcon="mdi-arrow-right" :disabled="isSubmitting" @click="reviewReplacement">Проверить перенос</BaseButton>
					</div>
				</form>
			</BaseIsland>

			<aside class="rr-sidebar">
				<BaseIsland title="Что будет передано" prependIcon="mdi-map-marker-path">
					<div class="rr-summary">
						<div class="rr-summary-row"><span class="rr-label">От кого</span><span class="rr-value">{{ form.oldJiraLogin.trim() || 'Укажите Jira-логин' }}</span></div>
						<div class="rr-summary-row"><span class="rr-label">Кому</span><span class="rr-value">{{ form.newJiraLogin.trim() || 'Укажите Jira-логин' }}</span></div>
						<div class="rr-summary-row"><span class="rr-label">Роль</span><span class="rr-value">{{ selectedRole?.value }}</span></div>
						<div class="rr-summary-row"><span class="rr-label">Старая система</span><span class="rr-value">{{ form.withOldSystem ? 'Включена' : 'Выключена' }}</span></div>
						<div class="rr-summary-row"><span class="rr-label">Способ</span><span class="rr-value">{{ selectedMethod?.title || 'Не выбран' }}</span></div>
					</div>
				</BaseIsland>
				<div class="rr-help">
					<strong class="rr-help-title">Сначала создайте нового пользователя</strong>
					<p class="rr-help-text">Для переназначения оба сотрудника уже должны существовать в системе. Создание учётной записи в эту операцию не входит.</p>
				</div>
			</aside>
		</div>
	</section>
</template>

<script lang="ts" setup>
import BaseAutocomplete from '~/components/common/base/BaseAutocomplete.vue';
import BaseBreadcrumbs from '~/components/common/base/BaseBreadcrumbs.vue';
import BaseButton from '~/components/common/base/BaseButton.vue';
import BaseCheckbox from '~/components/common/base/BaseCheckbox.vue';
import BaseIcon from '~/components/common/base/BaseIcon.vue';
import BaseIsland from '~/components/common/base/BaseIsland.vue';
import BaseTextBox from '~/components/common/base/BaseTextBox.vue';

definePageMeta({ layout: 'sidebar' });

const { $fetchUsers } = useNuxtApp();

type ReplacementRequest = {
	oldJiraLogin: string,
	newJiraLogin: string,
	replaceAssigneeType: 'duplicate' | 'replace',
	withOldSystem: boolean,
	role?: 'ORPSD' | 'SOVGO',
};

const roleOptions = [
	{ key: '', value: 'Без ограничения по роли' },
	{ key: 'ORPSD', value: 'ORPSD' },
	{ key: 'SOVGO', value: 'SOVGO' },
];
const methods = [
	{ key: 'duplicate', title: 'Без прежних задач', description: 'История предыдущих работ не переносится (остётся на старом начальнике).' },
	{ key: 'replace', title: 'Перенести подчинённых', description: 'История предыдущих работ переносится на нового начальника.' },
];
const methodOptions = methods.map(method => ({ key: method.key, value: method.title }));
const form = ref({ oldJiraLogin: '', newJiraLogin: '', role: '', withOldSystem: false, replaceAssigneeType: '' });
const errors = ref<Record<string, string>>({});
const isReviewing = ref(false);
const isSubmitting = ref(false);
const submitError = ref('');
const submitSuccess = ref('');
const pendingReplacement = ref<ReplacementRequest | null>(null);
const selectedRole = computed(() => roleOptions.find(role => role.key === form.value.role));
const selectedMethod = computed(() => methods.find(method => method.key === form.value.replaceAssigneeType));

watch(form, () => {
	errors.value = {};
	isReviewing.value = false;
	pendingReplacement.value = null;
	submitError.value = '';
	submitSuccess.value = '';
}, { deep: true, flush: 'sync' });

function reviewReplacement() {
	if(isReviewing.value || isSubmitting.value) return;
	const nextErrors: Record<string, string> = {};
	const oldLogin = form.value.oldJiraLogin.trim();
	const newLogin = form.value.newJiraLogin.trim();
	if(!oldLogin) nextErrors.oldJiraLogin = 'Укажите Jira-логин текущего сотрудника';
	if(!newLogin) nextErrors.newJiraLogin = 'Укажите Jira-логин нового сотрудника';
	else if(oldLogin.toLowerCase() === newLogin.toLowerCase()) nextErrors.newJiraLogin = 'Укажите другого сотрудника';
	if(!selectedRole.value) nextErrors.role = 'Выберите роль из списка';
	if(!selectedMethod.value) nextErrors.replaceAssigneeType = 'Выберите способ переноса';
	errors.value = nextErrors;
	if(Object.keys(nextErrors).length) return;
	submitError.value = '';
	submitSuccess.value = '';
	pendingReplacement.value = {
		oldJiraLogin: oldLogin,
		newJiraLogin: newLogin,
		replaceAssigneeType: form.value.replaceAssigneeType as ReplacementRequest['replaceAssigneeType'],
		withOldSystem: form.value.withOldSystem,
		...(form.value.role ? { role: form.value.role as ReplacementRequest['role'] } : {}),
	};
	isReviewing.value = true;
}

async function submitReplacement() {
	if(isSubmitting.value || !isReviewing.value || !pendingReplacement.value) return;
	const body = { ...pendingReplacement.value };
	submitError.value = '';
	submitSuccess.value = '';
	isSubmitting.value = true;
	try {
		const response = await $fetchUsers<{ code?: number, message?: string }>('/users/replace', {
			method: 'POST',
			body,
		});
		if(response?.code && response.code >= 400) throw new Error(response.message || 'Не удалось переназначить маршруты');
		submitSuccess.value = `Переназначение от ${body.oldJiraLogin} к ${body.newJiraLogin} выполнено.`;
		isReviewing.value = false;
		pendingReplacement.value = null;
	} catch (error: any) {
		const message = error?.data?.message ?? error?.message;
		submitError.value = Array.isArray(message) ? message.join('; ') : typeof message === 'string' ? message : 'Не удалось переназначить маршруты';
	} finally {
		isSubmitting.value = false;
	}
}

</script>

<style lang="scss">
.route-replacement {
	color: #172b4d;

	.rr-header {
		margin: 1em 0 1.4em;
		.rr-title { margin: 0 0 .4em; font-size: 28px; }
		.rr-description { margin: 0; color: #64748b; line-height: 1.6; }
	}
	.rr-layout {
		display: grid; grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr); align-items: start; gap: 1.4em;
		.rr-form {
			display: flex; flex-direction: column; gap: 1.5em;
			.rr-fields {
				margin: 0; padding: 0; border: 0; min-width: 0; display: flex; flex-direction: column; gap: 1.8em;
				.rr-people {
					display: grid; grid-template-columns: minmax(0, 1fr) 26px minmax(0, 1fr); align-items: start; gap: 1em;
					.rr-person {
						min-width: 0;
						.rr-step { font-weight: 700; margin-bottom: 1em; }
					}
					.rr-direction { margin-top: 3.3em; color: #94a3b8; }
				}
				.rr-scope {
					display: grid; grid-template-columns: 1fr 1fr; gap: 1em;
					.rr-role,
					.rr-legacy {
						min-width: 0;
						.base-checkbox {
							.checkbox-caption { white-space: normal; text-wrap: wrap; overflow: visible; }
						}
						.rr-hint { margin: .5em 0 0; color: #64748b; font-size: 12px; line-height: 1.5; }
					}
				}
				.rr-methods {
					.rr-step { font-weight: 700; margin-bottom: 1em; }
					.rr-method-description { font-size: 13px; line-height: 1.7; color: #64748b; margin-bottom: 0; }
				}
			}
			.rr-review {
				background: #fff9eb; border: 1px solid #f3dc9d; border-radius: 8px; padding: 1em;
				.rr-review-title { font-size: 14px; }
				.rr-review-description { font-size: 14px; line-height: 1.7; }
				.rr-hint { font-size: 12px; color: #64748b; line-height: 1.6; margin-bottom: 0; }
			}
			.rr-submit-error { padding: 1em; background: #f8e7e7; color: #c62828; border-radius: 8px; font-size: 14px; line-height: 1.6; }
			.rr-result { padding: 1em; background: #e7f8ef; color: #176845; border-radius: 8px; font-size: 14px; line-height: 1.6; }
			.rr-actions { display: flex; flex-wrap: wrap; gap: .7em; }
		}
		.rr-sidebar {
			.rr-summary {
				display: flex; flex-direction: column;
				.rr-summary-row {
					display: flex; flex-direction: column; gap: .4em; padding: .9em 0; border-bottom: 1px solid #edf0f5;
					&:first-child { padding-top: 0; }
					&:last-child { padding-bottom: 0; border-bottom: 0; }
					.rr-label { color: #64748b; font-size: 12px; }
					.rr-value { font-size: 14px; line-height: 1.5; overflow-wrap: anywhere; }
				}
			}
			.rr-help {
				padding: 1em; color: #64748b;
				.rr-help-title { font-size: 13px; color: #344563; }
				.rr-help-text { font-size: 13px; line-height: 1.7; margin-bottom: 0; }
			}
		}
	}
}
@media (max-width: 1100px) {
	.route-replacement {
		.rr-layout { grid-template-columns: 1fr; }
	}
}
@media (max-width: 700px) {
	.route-replacement {
		.rr-layout {
			.rr-form {
				.rr-fields {
					.rr-people {
						grid-template-columns: 1fr;
						.rr-direction { display: none; }
					}
					.rr-scope { grid-template-columns: 1fr; }
				}
			}
		}
	}
}
</style>
