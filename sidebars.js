/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docsSidebar: [
    "introduction",
    {
      type: "category",
      label: "Getting Started",
      items: [
        "installation",
        "configuration",
        "works",
        "common",
        "reverseproxy",
        "downgrade",
      ],
    },
    {
      type: "category",
      label: "Rules",
      items: ["rules", "glossary"],
    },
    {
      type: "category",
      label: "Collections",
      items: ["collections", "test-media"],
    },
    {
      type: "category",
      label: "Features",
      items: [
        "calendar-feature",
        "overlays-feature",
        "storage-metrics-feature",
      ],
    },
    {
      type: "category",
      label: "Notifications",
      items: ["notifications"],
    },
    {
      type: "category",
      label: "Community",
      items: ["contributing", "overlays-internals", "changelog"],
    },
    {
      type: "category",
      label: "API",
      items: ["api"],
    },
  ],
};

module.exports = sidebars;
