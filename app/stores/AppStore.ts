import { acceptHMRUpdate, defineStore } from 'pinia';

type Invoice = {
	amount: string;
	created: string;
	createdBy: string;
	id: number,
	payed: boolean;
	service: string;
};

type Issue = {
	address: string;
	date: string;
	id: number;
	issueKey: string;
	issueStatus: string;
	summary: string;

	payments?: Invoice[];

	showInvoices?: boolean;
	color?: string;
};

export const useAppStore = defineStore('app', {
	state: () => ({
		issues: [] as Issue[],
	}),
	actions: {}
});

// if(import.meta.hot) {
// 	import.meta.hot.accept(acceptHMRUpdate(useAppStore, import.meta.hot))
// }
