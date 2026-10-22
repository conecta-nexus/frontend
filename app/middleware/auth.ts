export default defineNuxtRouteMiddleware(async (to) => {
  const { accessToken, refreshToken, isAuthenticated, initSession } = useAuth()

  // If no in-memory access token exists but we have a refresh token cookie, attempt restore
  if (!accessToken.value && refreshToken.value) {
    await initSession()
  }

  if (!isAuthenticated.value) {
    return navigateTo({
      path: '/auth/login',
      query: to.path !== '/auth/login' ? { redirect: to.fullPath } : undefined,
    })
  }
})
