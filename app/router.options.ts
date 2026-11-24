import type { RouterConfig } from '@nuxt/schema'

export default <RouterConfig>{
  scrollBehavior(to, from, savedPosition) {
    if (to.hash) {
      return {
        el: to.hash,
        top: 80,
        behavior: 'smooth',
      }
    }
    if (savedPosition) {
      return savedPosition
    }
    if (to.path === '/challenges' && from.path === to.path
      && (to.query.page ?? '1') !== (from.query.page ?? '1')) {
      return {
        top: 0,
        left: 0,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      }
    }
    return { top: 0, left: 0 }
  },
}
