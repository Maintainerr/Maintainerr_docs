---
id: contributing
slug: /contributing
description: Contributing to Maintainerr in some way? Look no further. All you need to get started is here in this page.
title: Contributing
---

Thanks for helping improve the Maintainerr documentation.

Guides, walkthroughs, corrections, screenshots, wording improvements, and structural cleanup are all useful contributions.

### Local Development

Install dependencies:

```bash
npm install
```

Start the local development server:

```bash
npm start
```

Create a production build:

```bash
npm run build
```

Serve the production build locally:

```bash
npm run serve
```

### Project Structure

- `docs/` contains the main documentation pages
- `blog/` contains walkthroughs and blog posts
- `static/` contains static assets such as images and other files served directly
- `src/` contains site-level styling and React-based customizations
- `docusaurus.config.js` contains the site configuration
- `sidebars.js` contains the docs navigation structure

## Docs Contribution Guidelines

- Keep pull requests focused and easy to review
- Prefer native Markdown and Docusaurus syntax over raw HTML when possible
- Use `media server` unless a page is describing Plex-specific or Jellyfin-specific behavior
- Use `Seerr` instead of older separate Overseerr or Jellyseerr terminology
- Verify screenshots, labels, and workflow wording against the current app behavior before merging
- Run `npm run build` before opening a pull request when you make structural or formatting changes

If you are making a larger docs change, it is usually better to split content cleanup, structural changes, and visual changes into separate pull requests.

## App Contributions

If you want to contribute to the Maintainerr application itself, use the upstream app repository guide:

- [Maintainerr App Contributing Guide](https://github.com/maintainerr/maintainerr/blob/main/CONTRIBUTING.md)

That guide covers:

- development environment setup
- branch and pull request expectations
- Conventional Commits
- code formatting and review expectations
- UI text guidelines
- AI-assisted contribution expectations

## Need Help?

If you are unsure where to start, open an issue or ask in the community:

- [Maintainerr Discord](https://discord.maintainerr.info)
- [Docs Repository Issues](https://github.com/maintainerr/Maintainerr_docs/issues)
