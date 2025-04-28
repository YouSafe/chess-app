import './assets/styles.css'

import init from '../pkg'

import { createApp } from 'vue'
import App from './App.vue'

try {
    await init()
} catch (err) {
    console.log(err)
}

createApp(App).mount('#app')
