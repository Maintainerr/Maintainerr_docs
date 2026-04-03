const config = {
  title: 'Maintainerr Documentation',
  tagline: 'Documentation for the Maintainerr project.',
  favicon: 'img/favicon.ico',
  url: 'https://docs.maintainerr.info',
  baseUrl: '/',
  organizationName: 'Maintainerr',
  projectName: 'Maintainerr_docs',
  customFields: {
    feedbackIssueUrl:
      'https://github.com/Maintainerr/Maintainerr_docs/issues/new/choose',
    privacyPolicyUrl: 'https://maintainerr.info/privacy',
    matomo: {
      siteId: '2',
      trackerUrl: 'https://analytics.maintainerr.info/',
      enabled: true,
    },
  },
  trailingSlash: true,
  onBrokenLinks: 'warn',
  staticDirectories: ['static'],
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  plugins: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        indexDocs: true,
        indexBlog: true,
        docsRouteBasePath: '/',
        blogRouteBasePath: '/blog',
      },
    ],
  ],
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
          includeCurrentVersion: false,
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
    tableOfContents: {
      maxHeadingLevel: 4,
    },
    navbar: {
      hideOnScroll: true,
      title: 'Maintainerr Docs',
      logo: {
        alt: 'Maintainerr logo',
        src: 'img/logo_icon.svg',
      },
      items: [
        { to: '/installation', label: 'Get Started', position: 'left' },
        { to: '/configuration', label: 'Configuration', position: 'left' },
        { to: '/rules', label: 'Rules', position: 'left' },
        {
          type: 'docsVersionDropdown',
          position: 'right',
          dropdownActiveClassDisabled: true,
        },
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
            {
              label: 'Changelog',
              href: 'https://github.com/Maintainerr/Maintainerr/releases',
            },
            {
              label: 'Status of Services',
              href: 'https://status.maintainerr.info',
            },
            {
              label: 'Feature Requests',
              href: 'https://features.maintainerr.info/?view=most-wanted',
            },
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
              label: 'Docker Hub',
              href: 'https://hub.docker.com/r/maintainerr/maintainerr/',
            },
            {
              label: 'GHCR Package',
              href: 'https://ghcr.io/maintainerr/maintainerr',
            },
          ],
        },
      ],
      logo: {
        alt: 'Maintainerr logo',
        src: 'img/logo.svg',
        width: 250,
        height: 72,
      },
      copyright: `Copyright (c) ${new Date().getFullYear()} Maintainerr`,
    },
  },
}

module.exports = config
