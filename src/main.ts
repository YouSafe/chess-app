import './assets/styles.css'

import { createApp } from 'vue'
import App from './App.vue'

import { registerSW } from 'virtual:pwa-register'

registerSW({
    onRegisteredSW(_swUrl: string, _registration: ServiceWorkerRegistration | undefined) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if ((window as any)._hasReloadedOnce) return
            (window as any)._hasReloadedOnce = true
            console.info("Reload page after registering service worker")
            window.location.reload()
        })
    },
    onRegisterError(error: any) {
        console.error('Service worker registration failed:', error)
    }
})

createApp(App).mount('#app')
