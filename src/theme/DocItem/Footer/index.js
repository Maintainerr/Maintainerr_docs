import React from 'react'
import DocItemFooter from '@theme-original/DocItem/Footer'
import DocFeedback from '@site/src/components/DocFeedback'
import {useDoc} from '@docusaurus/plugin-content-docs/client'

export default function DocItemFooterWrapper(props) {
  const {metadata} = useDoc()
  const hideFeedback = metadata.id === 'introduction'

  return (
    <>
      <DocItemFooter {...props} />
      {!hideFeedback && <DocFeedback />}
    </>
  )
}
