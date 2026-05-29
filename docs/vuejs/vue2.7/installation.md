## create vite

### Vue cli

```bash
npm install -g @vue/cli@4
```

- create vue project
```bash
vue create vue2-learning
```

### Vite

```bash
 npm create vite@latest my-app -- --template vue
```

## main.js

```js
import Vue from 'vue'

import App from './App.vue'

new Vue({
    render: h => h(App),
}).$mount("#app")
```

- `package.json`

```json
{
  "name": "my-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^2.7.16"
  },
  "devDependencies": {
    "@vitejs/plugin-vue2": "^2.2.6",
    "vite": "^4.5.0"
  }
}

```

- install

```bash
npm install --legacy-peer-deps
```