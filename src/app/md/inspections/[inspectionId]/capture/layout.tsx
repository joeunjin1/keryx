// 검수 캡처 페이지는 모바일 전용 카메라 UI이므로 AdminShell 레이아웃 제외
export default function CaptureLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
