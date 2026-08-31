'use client'
import { Component, type ReactNode } from 'react'

/**
 * 배경 렌더링 실패가 페이지 전체를 무너뜨리지 않게 막는 경계.
 *
 * WebGL 컨텍스트 생성 실패는 try/catch로 잡지만, 셰이더 컴파일 실패나
 * 지오메트리 생성 오류처럼 다른 지점에서 던지는 예외까지 전부 예측할 수는 없다.
 * 배경은 **장식**이므로 어떤 이유로 실패하든 본문이 사라져서는 안 된다.
 *
 * 실패하면 children을 버리고 아무것도 렌더하지 않는다.
 * 유색 암부는 SectionBackdrop(CSS 전용)이 계속 담당하므로 화면이 비지 않는다.
 */
export default class VisualErrorBoundary extends Component<
  { children: ReactNode; onError?: () => void },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error) {
    console.warn('[VisualSystem] 배경 렌더링 실패 — CSS 배경으로 계속합니다.', error)
    this.props.onError?.()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
