import React, { useEffect, useMemo, useState } from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import { useLocation } from "@docusaurus/router";
import styles from "./styles.module.css";

const CONSENT_KEY = "maintainerr-docs-consent";
const MATOMO_SCRIPT_ID = "maintainerr-matomo-script";

// Set by the swizzled NotFound page so the next page view is tagged as a 404.
let pendingNotFound = false;

export function flagNotFound() {
  pendingNotFound = true;
}

function getStoredConsent() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(CONSENT_KEY);
}

function loadMatomo({ trackerUrl, siteId }) {
  if (
    typeof window === "undefined" ||
    !trackerUrl ||
    !siteId ||
    document.getElementById(MATOMO_SCRIPT_ID)
  ) {
    return;
  }

  const normalizedTrackerUrl = trackerUrl.endsWith("/")
    ? trackerUrl
    : `${trackerUrl}/`;

  window._paq = window._paq || [];
  window._paq.push(["disableCookies"]);
  window._paq.push(["trackPageView"]);
  window._paq.push(["enableLinkTracking"]);
  window._paq.push(["setTrackerUrl", `${normalizedTrackerUrl}matomo.php`]);
  window._paq.push(["setSiteId", siteId]);

  const script = document.createElement("script");
  script.id = MATOMO_SCRIPT_ID;
  script.async = true;
  script.src = `${normalizedTrackerUrl}matomo.js`;
  document.head.appendChild(script);
}

function trackPageView(location) {
  if (typeof window === "undefined" || !window._paq) {
    return;
  }

  const fullPath = `${location.pathname}${location.search}${location.hash}`;
  window._paq.push(["setCustomUrl", fullPath]);

  if (pendingNotFound) {
    pendingNotFound = false;
    // Matomo's recommended 404 tagging: title prefixed with "404/URL = ...".
    window._paq.push([
      "setDocumentTitle",
      `404/URL = ${encodeURIComponent(fullPath)}/From = ${encodeURIComponent(
        document.referrer,
      )}`,
    ]);
  } else {
    window._paq.push(["setDocumentTitle", document.title]);
  }

  window._paq.push(["trackPageView"]);
}

function trackSiteSearch(keyword) {
  if (typeof window === "undefined" || !window._paq) {
    return;
  }

  // category and result count are left unset (false) — cookieless, aggregate.
  window._paq.push(["trackSiteSearch", keyword, false, false]);
}

export function trackMatomoEvent(category, action, name) {
  if (typeof window === "undefined" || !window._paq) {
    return;
  }

  window._paq.push(["trackEvent", category, action, name]);
}

export default function SiteConsent() {
  const { siteConfig } = useDocusaurusContext();
  const location = useLocation();
  const [consent, setConsent] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const matomoConfig = useMemo(
    () => siteConfig.customFields?.matomo ?? {},
    [siteConfig],
  );
  const privacyPolicyUrl =
    siteConfig.customFields?.privacyPolicyUrl ??
    "https://maintainerr.info/privacy.html";

  useEffect(() => {
    setConsent(getStoredConsent());
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (consent !== "accepted" || !matomoConfig.enabled) {
      return;
    }

    loadMatomo(matomoConfig);
  }, [consent, matomoConfig]);

  useEffect(() => {
    if (consent !== "accepted" || !matomoConfig.enabled) {
      return;
    }

    trackPageView(location);
  }, [consent, location, matomoConfig.enabled]);

  // Track docs-search queries (cookieless). The local search updates results
  // as you type, so debounce and also fire on Enter; min length avoids noise.
  useEffect(() => {
    if (consent !== "accepted" || !matomoConfig.enabled) {
      return;
    }

    const SELECTOR = ".navbar__search-input";
    let timer;
    let lastTracked = "";

    function record(value) {
      const keyword = value.trim();
      if (keyword.length < 3 || keyword === lastTracked) {
        return;
      }
      lastTracked = keyword;
      trackSiteSearch(keyword);
    }

    function onInput(event) {
      const target = event.target;
      if (!target.matches || !target.matches(SELECTOR)) {
        return;
      }
      clearTimeout(timer);
      const { value } = target;
      timer = setTimeout(() => record(value), 1500);
    }

    function onKeydown(event) {
      if (event.key !== "Enter") {
        return;
      }
      const target = event.target;
      if (!target.matches || !target.matches(SELECTOR)) {
        return;
      }
      clearTimeout(timer);
      record(target.value);
    }

    document.addEventListener("input", onInput, true);
    document.addEventListener("keydown", onKeydown, true);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("keydown", onKeydown, true);
    };
  }, [consent, matomoConfig.enabled]);

  function updateConsent(nextConsent) {
    window.localStorage.setItem(CONSENT_KEY, nextConsent);
    setConsent(nextConsent);

    if (nextConsent === "accepted") {
      trackMatomoEvent("cookie-consent", "accept", "analytics");
    }
  }

  if (!isReady || consent !== null) {
    return null;
  }

  return (
    <div
      className={styles.banner}
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
    >
      <div className={styles.content}>
        <p className={styles.title}>Help us, help you.</p>
        <p className={styles.copy}>
          We use privacy-friendly analytics to understand which docs are useful
          and where people get stuck. You can read the full policy at{" "}
          <a href={privacyPolicyUrl}>Maintainerr Privacy Policy</a>.
        </p>
      </div>
      <div className={styles.actions}>
        <button
          className="button button--primary button--sm"
          onClick={() => updateConsent("accepted")}
        >
          Accept
        </button>
        <button
          className="button button--secondary button--sm"
          onClick={() => updateConsent("rejected")}
        >
          Reject
        </button>
      </div>
    </div>
  );
}
