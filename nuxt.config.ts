// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  colorMode: {
    preference: 'light',
    fallback: 'light',
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
})
