'use client'
import { Leva, useControls, folder } from 'leva'
import { labParams, requestRebuild, DEFAULT_PARAMS, type LabParams, type DebugView } from './labParams'

/**
 * Leva 디버그 패널 (문서 §12).  z-index 30.
 *
 * 모든 입력은 `transient: true`. 슬라이더를 움직여도 React는 리렌더되지 않고
 * onChange가 labParams를 직접 변형하며, RAF 루프가 다음 프레임에 uniform으로
 * 반영한다.
 *
 * 버퍼를 다시 만들어야 하는 값(입자 수·분포)만 requestRebuild()를 호출한다.
 */

type NumKey = { [K in keyof LabParams]: LabParams[K] extends number ? K : never }[keyof LabParams]
type VecKey = { [K in keyof LabParams]: LabParams[K] extends [number, number, number] ? K : never }[keyof LabParams]

function num(k: NumKey, min: number, max: number, step: number, rebuild = false) {
  return {
    value: DEFAULT_PARAMS[k],
    min, max, step,
    transient: true as const,
    onChange: (v: number) => {
      labParams[k] = v
      if (rebuild) requestRebuild()
    },
  }
}

function vec(k: VecKey, step = 0.02) {
  return {
    value: DEFAULT_PARAMS[k],
    step,
    transient: true as const,
    onChange: (v: [number, number, number]) => { labParams[k] = v },
  }
}

export default function DebugPanel() {
  useControls(() => ({
    Composition: folder({
      imageFieldOpacity:     num('imageFieldOpacity', 0, 1, 0.01),
      densityThreshold:      num('densityThreshold', 0.15, 0.85, 0.01, true),
      densityContrast:       num('densityContrast', 0.6, 2.5, 0.05, true),
      foregroundDensity:     num('foregroundDensity', 0, 1, 0.01),
      contentFeather:        num('contentFeather', 0.01, 0.16, 0.005),
      contentSuppression:    num('contentSuppression', 0, 1, 0.01),
      brightnessSuppression: num('brightnessSuppression', 0, 1, 0.01),
      pointerSuppression:    num('pointerSuppression', 0, 1, 0.01),
      coreOcclusion:         num('coreOcclusion', 0, 1, 0.01),
      deflect:               num('deflect', 0, 1.2, 0.01),
    }, { collapsed: false }),

    Space: folder({
      warp:          num('warp', 0, 0.30, 0.005),
      fieldLevel:    num('fieldLevel', 0, 1.6, 0.01),
      corridor:      num('corridor', 0, 1, 0.01),
      shadow:        num('shadow', 0, 1, 0.01),
      surfaceCol:    vec('surfaceCol'),
      shadowCol:     vec('shadowCol', 0.005),
      coneWidth:     num('coneWidth', 0.12, 1.4, 0.01),
      coneFalloff:   num('coneFalloff', 0.05, 2.5, 0.01),
      coneLevel:     num('coneLevel', 0, 2, 0.01),
      scatterLevel:  num('scatterLevel', 0, 2, 0.01),
      reflectLevel:  num('reflectLevel', 0, 3, 0.01),
      coolCol:       vec('coolCol'),
      splatAniso:    num('splatAniso', 0, 1.2, 0.01),
      nearRatio:     num('nearRatio', 0.01, 0.15, 0.005, true),
    }, { collapsed: false }),

    Splat: folder({
      count:            num('count', 8_000, 140_000, 1_000, true),
      microRatio:       num('microRatio', 0.20, 0.70, 0.01, true),
      mediumRatio:      num('mediumRatio', 0.15, 0.60, 0.01, true),
      largeRatio:       num('largeRatio', 0.05, 0.30, 0.01, true),
      sizeScale:        num('sizeScale', 0.3, 2.5, 0.05),
      gaussianSoftness: num('gaussianSoftness', 0.4, 2.5, 0.05),
      opacity:          num('opacity', 0.05, 2.0, 0.01),
      reflectance:      num('reflectance', 0.05, 2.5, 0.01),
      additiveRatio:    num('additiveRatio', 0, 0.30, 0.01, true),
    }, { collapsed: true }),

    Flow: folder({
      baseCurlScale:     num('baseCurlScale', 0.05, 0.9, 0.01),
      baseCurlStrength:  num('baseCurlStrength', 0, 0.20, 0.002),
      pointerSmoothing:  num('pointerSmoothing', 0.010, 0.120, 0.001),
      velocitySmoothing: num('velocitySmoothing', 0.03, 0.40, 0.005),
      pointerRadius:     num('pointerRadius', 0.04, 0.45, 0.005),
      pointerForce:      num('pointerForce', 0, 2.0, 0.01),
      velocityDamping:   num('velocityDamping', 0.90, 0.999, 0.001),
      wakeTau:           num('wakeTau', 0.4, 6.0, 0.1),
      maxDisplacement:   num('maxDisplacement', 0.02, 1.6, 0.01),
      swirl:             num('swirl', 0, 1.5, 0.01),
      maxPointerSpeed:   num('maxPointerSpeed', 0.005, 0.20, 0.005),
    }, { collapsed: true }),

    Light: folder({
      mainLight:         vec('mainLight', 0.05),
      mainLightColor:    vec('mainLightColor'),
      sideLight:         vec('sideLight', 0.05),
      sideLightColor:    vec('sideLightColor'),
      sideLevel:         num('sideLevel', 0, 1.2, 0.01),
      albedoNear:        vec('albedoNear'),
      albedoFar:         vec('albedoFar'),
      fogAbsorb:         num('fogAbsorb', 0, 1, 0.01),
      ambient:           vec('ambient', 0.005),
      fogDensity:        num('fogDensity', 0, 1.6, 0.01),
      fogScattering:     num('fogScattering', 0, 2.5, 0.02),
      exposureResponse:  num('exposureResponse', 0, 2.0, 0.02),
      scatterAnisotropy: num('scatterAnisotropy', 0, 0.92, 0.01),
    }, { collapsed: true }),

    Debug: folder({
      view: {
        value: DEFAULT_PARAMS.view,
        options: ['composite', 'l0', 'l1', 'l2', 'l1l2', 'far', 'mid', 'near', 'masks', 'velocity'],
        transient: true,
        onChange: (v: DebugView) => { labParams.view = v },
      },
    }, { collapsed: false }),
  }))

  return (
    <>
      {/* 문서 §2 의 z-index 30. Leva는 테마로 z를 받지 않아 CSS로 고정한다. */}
      <style>{`#leva__root { z-index: 30; position: relative; }`}</style>
      <Leva collapsed={false} />
    </>
  )
}
