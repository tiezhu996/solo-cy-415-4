import 'vant/lib/index.css';
import './styles.css';

import { createPinia } from 'pinia';
import { createApp } from 'vue';

import App from './App.vue';
import router from './router';
import { storage } from './utils/storage';

void storage.cleanExpired();

createApp(App).use(createPinia()).use(router).mount('#app');
