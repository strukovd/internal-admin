export default defineNuxtRouteMiddleware((to) => {
	if(import.meta.server) return;

	const userStore = useUserStore();
	userStore.loadFromStorage();

	const isLoginPage = to.path === '/login';
	const requiresAuth = to.meta.layout === 'sidebar';

	if(isLoginPage && userStore.isAuthenticated) {
		return navigateTo('/dashboard');
	}

	if(requiresAuth && !userStore.isAuthenticated) {
		return navigateTo('/login');
	}
});
