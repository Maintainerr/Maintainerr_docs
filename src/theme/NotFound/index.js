import React, { useLayoutEffect } from "react";
import NotFound from "@theme-original/NotFound";
import { useLocation } from "@docusaurus/router";
import { flagNotFound } from "@site/src/components/SiteConsent";

// Wraps the default 404 page so SiteConsent tags the next Matomo page view as
// a 404. useLayoutEffect runs before SiteConsent's (passive) page-view effect,
// so the flag is set in time; keyed on pathname to cover 404 -> 404 navigation.
export default function NotFoundWrapper(props) {
  const location = useLocation();

  useLayoutEffect(() => {
    flagNotFound();
  }, [location.pathname]);

  return <NotFound {...props} />;
}
