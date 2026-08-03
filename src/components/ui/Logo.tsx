/**
 * KERYX Logo 컴포넌트
 * 
 * 사용 예시:
 *   <Logo variant="horizontal" theme="dark" size="md" />   // 다크 헤더
 *   <Logo variant="horizontal" theme="light" size="md" />  // 라이트 페이지
 *   <Logo variant="vertical" theme="light" size="sm" />    // 카드/이메일
 *   <Logo variant="symbol" size="sm" />                    // 서명/작은 공간
 *   <Logo variant="favicon" size="xs" />                   // 파비콘 자리
 * 
 * 로고 디자인이 바뀌어도 이 파일 1개만 수정하면 전체 사이트 자동 반영.
 */

import Image from 'next/image';

type LogoVariant = 'horizontal' | 'vertical' | 'symbol' | 'favicon';
type LogoTheme = 'dark' | 'light' | 'auto';
type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface LogoProps {
  variant?: LogoVariant;
  theme?: LogoTheme;
  size?: LogoSize;
  className?: string;
  priority?: boolean;
  /** 링크 없이 순수 이미지만 렌더링 */
  noLink?: boolean;
}

/** 사이즈별 픽셀 정의 */
const sizeMap: Record<LogoSize, { width: number; height: number }> = {
  xs:  { width: 24,  height: 24  },
  sm:  { width: 80,  height: 32  },
  md:  { width: 140, height: 40  },
  lg:  { width: 200, height: 56  },
  xl:  { width: 280, height: 72  },
};

/** 세로형은 정사각형에 가까운 비율 */
const verticalSizeMap: Record<LogoSize, { width: number; height: number }> = {
  xs:  { width: 40,  height: 40  },
  sm:  { width: 60,  height: 60  },
  md:  { width: 90,  height: 90  },
  lg:  { width: 120, height: 120 },
  xl:  { width: 160, height: 160 },
};

/** 심볼/파비콘은 정사각형 */
const squareSizeMap: Record<LogoSize, { width: number; height: number }> = {
  xs:  { width: 20,  height: 20  },
  sm:  { width: 28,  height: 28  },
  md:  { width: 40,  height: 40  },
  lg:  { width: 56,  height: 56  },
  xl:  { width: 80,  height: 80  },
};

function getLogoSrc(variant: LogoVariant, theme: LogoTheme): string {
  switch (variant) {
    case 'horizontal':
      return theme === 'light'
        ? '/logos/svg/keryx-horizontal-light.svg'
        : '/logos/svg/keryx-horizontal-dark.svg';
    case 'vertical':
      return '/logos/svg/keryx-vertical.svg';
    case 'symbol':
      return '/logos/svg/keryx-symbol.svg';
    case 'favicon':
      return '/logos/svg/keryx-favicon.svg';
    default:
      return '/logos/svg/keryx-horizontal-dark.svg';
  }
}

function getDimensions(variant: LogoVariant, size: LogoSize) {
  if (variant === 'vertical') return verticalSizeMap[size];
  if (variant === 'symbol' || variant === 'favicon') return squareSizeMap[size];
  return sizeMap[size];
}

export function Logo({
  variant = 'horizontal',
  theme = 'dark',
  size = 'md',
  className = '',
  priority = false,
  noLink: _noLink = false,
}: LogoProps) {
  const src = getLogoSrc(variant, theme);
  const { width, height } = getDimensions(variant, size);

  return (
    <Image
      src={src}
      alt="KERYX"
      width={width}
      height={height}
      priority={priority}
      className={className}
      style={{ objectFit: 'contain', display: 'block' }}
      onError={(e) => {
        // SVG 로드 실패 시 텍스트 폴백
        const el = e.currentTarget as HTMLImageElement;
        el.style.display = 'none';
        const fallback = document.createElement('span');
        fallback.textContent = 'KERYX';
        fallback.style.cssText = `font-weight:900;letter-spacing:-0.04em;font-size:${height * 0.5}px;color:${theme === 'light' ? '#0d1b3e' : 'white'}`;
        el.parentElement?.appendChild(fallback);
      }}
    />
  );
}

export default Logo;
