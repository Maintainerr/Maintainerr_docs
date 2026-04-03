import React from 'react'
import InlineTooltip from '../InlineTooltip'
import styles from './styles.module.css'

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
                        <InlineTooltip
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
