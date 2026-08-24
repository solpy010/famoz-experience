'use client'
import { useState, useEffect } from 'react'
import IntroSequence from '@/components/IntroSequence'
import HeroScene from '@/components/HeroScene'
import WhatWeCreate from '@/components/WhatWeCreate'
import ValueScene from '@/components/ValueScene'
import PublicValue from '@/components/PublicValue'
import WorksFilm from '@/components/WorksFilm'
import EndingScene from '@/components/EndingScene'
import ParallaxSystem from '@/components/ParallaxSystem'

export default function Home() {
  const [introComplete, setIntroComplete] = useState(false)

  // Lock body scroll during intro
  useEffect(() => {
    document.body.classList.add('intro-active')
    document.body.style.overflow = 'hidden'
  }, [])

  const handleEntered = () => {
    setIntroComplete(true)
    document.body.classList.remove('intro-active')
    document.body.classList.add('experience-entered')
    document.body.style.overflow = ''
  }

  return (
    <>
      <ParallaxSystem />

      {!introComplete && <IntroSequence onEntered={handleEntered} />}

      <HeroScene introComplete={introComplete} />
      <WhatWeCreate />
      <ValueScene />
      <PublicValue />
      <WorksFilm />
      <EndingScene />
    </>
  )
}
