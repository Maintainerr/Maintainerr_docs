import React, { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './styles.module.css'

function AnnotationBadge({ label, tooltip }) {
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

export default function AnnotatedCodeBlock({
  code,
  language = 'text',
  annotations = [],
}) {
  const lines = code.replace(/\n$/, '').split('\n')
  const annotationsByLine = annotations.reduce((map, annotation) => {
    const list = map.get(annotation.line) ?? []
    list.push(annotation)
    map.set(annotation.line, list)
    return map
  }, new Map())

  return (
    <div className={styles.wrapper}>
      <div className={styles.scroller}>
        <pre className={styles.pre}>
          <code className={styles.code} data-language={language}>
            {lines.map((line, index) => {
              const lineNumber = index + 1
              const lineAnnotations = annotationsByLine.get(lineNumber) ?? []

              return (
                <span className={styles.line} key={lineNumber}>
                  <span className={styles.lineText}>{line || ' '}</span>
                  {lineAnnotations.length > 0 ? (
                    <span className={styles.annotationGroup}>
                      {lineAnnotations.map((annotation) => (
                        <AnnotationBadge
                          key={`${lineNumber}-${annotation.label}-${annotation.tooltip}`}
                          label={annotation.label}
                          tooltip={annotation.tooltip}
                        />
                      ))}
                    </span>
                  ) : null}
                </span>
              )
            })}
          </code>
        </pre>
      </div>
    </div>
  )
}
