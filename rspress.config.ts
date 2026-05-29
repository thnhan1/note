import * as path from 'node:path';
import { defineConfig } from '@rspress/core';
import pluginMermaid from 'rspress-plugin-mermaid';

export default defineConfig({
  plugins: [pluginMermaid()],
  root: path.join(process.cwd(), 'docs'),
  title: 'AEM Learning Notes',
  description: 'AEM 6.5 learning notes, VueJS integration, and web debugging tips.',
  base: '/note/',
  icon: '/img/favicon.ico',
  logo: {
    light: '/img/logo.svg',
    dark: '/img/logo.svg',
  },
  logoText: 'AEM Notes',
  markdown: {
    link: { checkDeadLinks: false },
    image: { checkDeadImages: false },
  },
  themeConfig: {
    lastUpdated: true,
    enableContentAnimation: true,
    enableScrollToTop: true,
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com/thnhan1/aem-notes',
      },
    ],
    footer: {
      message: `Copyright © ${new Date().getFullYear()} Nhan. Built with Rspress.`,
    },
  },
});
