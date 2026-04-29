export default defineNuxtPlugin(() => {
  const user = useUserStore()
  user.loadFromStorage()
})
