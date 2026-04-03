import React from 'react'
import SiteConsent from '@site/src/components/SiteConsent'

export default function Root({children}) {
  return (
    <>
      {children}
      <SiteConsent />
    </>
  )
}
