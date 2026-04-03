import React, {useMemo, useState} from 'react'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import {useLocation} from '@docusaurus/router'
import styles from './styles.module.css'
import {trackMatomoEvent} from '../SiteConsent'

export default function DocFeedback() {
  const {siteConfig} = useDocusaurusContext()
  const location = useLocation()
  const [selection, setSelection] = useState(null)
  const issueUrl = siteConfig.customFields?.feedbackIssueUrl
  const pageId = useMemo(
    () => `${location.pathname}${location.search}${location.hash}`,
    [location.hash, location.pathname, location.search],
  )

  function handleSelection(nextSelection) {
    setSelection(nextSelection)
    trackMatomoEvent('docs-feedback', nextSelection, pageId)
  }

  return (
    <div className={styles.feedback}>
      <p className={styles.title}>Was this page helpful?</p>
      <div className={styles.actions}>
        <button
          type="button"
          className={`button button--secondary button--sm ${selection === 'helpful' ? styles.active : ''}`}
          onClick={() => handleSelection('helpful')}>
          Yes
        </button>
        <button
          type="button"
          className={`button button--secondary button--sm ${selection === 'improve' ? styles.active : ''}`}
          onClick={() => handleSelection('improve')}>
          No
        </button>
      </div>
      {selection === 'helpful' && <p className={styles.note}>Thanks for the feedback.</p>}
      {selection === 'improve' && (
        <p className={styles.note}>
          Thanks for the feedback. Help us improve this page by opening an issue in the{' '}
          <a href={issueUrl}>docs repo</a>.
        </p>
      )}
    </div>
  )
}
