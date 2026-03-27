const config = {
  title: 'Maintainerr Documentation',
  tagline: 'Documentation for the Maintainerr project.',
  favicon: 'img/favicon.ico',
  url: 'https://docs.maintainerr.info',
  baseUrl: '/',
  organizationName: 'Maintainerr',
  projectName: 'Maintainerr_docs',
  trailingSlash: true,
  onBrokenLinks: 'warn',
  staticDirectories: ['static'],
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  presets: [
    [
      'classic',
      {
        docs: {
          path: 'docs',
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
        },
        blog: {
          blogTitle: 'Maintainerr Walkthroughs',
          blogDescription:
            'A collection of walkthroughs and tutorials for using Maintainerr.',
          postsPerPage: 'ALL',
          sortPosts: 'ascending',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },
    image: 'img/docs_image.png',
    navbar: {
      title: 'Maintainerr Docs',
      logo: {
        alt: 'Maintainerr logo',
        src: 'img/logo_icon.svg',
      },
      items: [
        { to: '/installation', label: 'Get Started', position: 'left' },
        { to: '/configuration', label: 'Configuration', position: 'left' },
        { to: '/rules', label: 'Rules', position: 'left' },
        { to: '/blog', label: 'Walkthroughs', position: 'left' },
        {
          href: 'https://github.com/maintainerr/maintainerr',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Installation', to: '/installation' },
            { label: 'Configuration', to: '/configuration' },
            { label: 'API', to: '/api' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'Introduction', to: '/' },
            { label: 'Contributing', to: '/contributing' },
            {
              label: 'Discord',
              href: 'https://discord.maintainerr.info',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/maintainerr/maintainerr',
            },
            {
              label: 'Docker Hub',
              href: 'https://hub.docker.com/r/maintainerr/maintainerr/',
            },
          ],
        },
      ],
      copyright: `Copyright (c) ${new Date().getFullYear()} Maintainerr`,
    },
  },
}

module.exports = config
