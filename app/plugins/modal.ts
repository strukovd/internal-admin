type ModalPlugin = {
	show: (template: string, options?: ModalOptions) => Promise<any>;
	close: () => void;
	closeAll: () => void;
}
export type ModalModel = {
	template: string;
	options?: ModalOptions;

	resolve?: (payload: any) => void;
	reject?: (payload: any) => void;
}
export type ModalOptions = {
	title?: string;
	payload?: any;
	icon?: string;
	nonCloseable?: boolean;
}
declare module '@vue/runtime-core' {
	interface ComponentCustomProperties {
		$modal: ModalPlugin;
	}
}
declare module '#app' {
  interface NuxtApp {
    $modal: ModalPlugin;
  }
}


export default defineNuxtPlugin((nuxtApp) => {
	const modal: ModalPlugin = {
		show: (template: string, options?: ModalOptions) => {
			return new Promise<any>((resolve, reject) => {
			const appStore = useAppStore();
			if (appStore) {
				appStore.modals.push({
				template,
				options,
				resolve,
				reject
				});
			} else {
				console.warn('Метод $modal.show: Невозможно открыть модальное окно, appStore еще не инициализирован');
			}
			});

		},

		close: () => {
			const appStore = useAppStore();
			if (appStore) {
			const modal = appStore.modals.pop();
			if(modal && modal.resolve) modal?.resolve(true);
			} else {
			console.warn('Метод $modal.close: Невозможно закрыть модальное окно, appStore еще не инициализирован');
			}
		},

		closeAll: () => {
			const appStore = useAppStore();
			if (appStore) {
			appStore.modals = [];
			} else {
			console.warn('Метод $modal.closeAll: Невозможно закрыть модальные окна, appStore еще не инициализирован');
			}
		}
	};

	nuxtApp.provide('modal', modal);
});
