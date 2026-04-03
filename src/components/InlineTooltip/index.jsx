import React, { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './styles.module.css'

export default function InlineTooltip({ label, tooltip }) {
  const tooltipId = useId()
  const [position, setPosition] = useState(null)

  function updatePosition(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    setPosition({
      left: rect.left + rect.width / 2,
      top: rect.top - 10,
    })
  }

  function hideTooltip() {
    setPosition(null)
  }

  useEffect(() => {
    if (!position) {
      return undefined
    }

    function dismissTooltip() {
      setPosition(null)
    }

    window.addEventListener('scroll', dismissTooltip, true)
    window.addEventListener('resize', dismissTooltip)

    return () => {
      window.removeEventListener('scroll', dismissTooltip, true)
      window.removeEventListener('resize', dismissTooltip)
    }
  }, [position])

  return (
    <>
      <span
        aria-describedby={position ? tooltipId : undefined}
        className={styles.badgeWrapper}
        onBlur={hideTooltip}
        onFocus={updatePosition}
        onMouseEnter={updatePosition}
        onMouseLeave={hideTooltip}
        tabIndex={0}
      >
        <span className={styles.badge}>{label}</span>
      </span>
      {position && typeof document !== 'undefined'
        ? createPortal(
            <span
              className={styles.portalTooltip}
              id={tooltipId}
              role="tooltip"
              style={{
                left: `${position.left}px`,
                top: `${position.top}px`,
              }}
            >
              {tooltip}
            </span>,
            document.body
          )
        : null}
    </>
  )
}
