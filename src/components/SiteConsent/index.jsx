import React, { useEffect, useMemo, useState } from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import { useLocation } from "@docusaurus/router";
import styles from "./styles.module.css";

const CONSENT_KEY = "maintainerr-docs-consent";
const MATOMO_SCRIPT_ID = "maintainerr-matomo-script";

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
  window._paq.push(["setDocumentTitle", document.title]);
  window._paq.push(["trackPageView"]);
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
