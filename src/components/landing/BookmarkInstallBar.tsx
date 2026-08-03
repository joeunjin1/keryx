'use client';
import { useState, useEffect } from 'react';

interface Props {
  pageTitle: string;
  pageTitleZh: string;
  pageUrl: string;
  lang: 'ko' | 'zh';
}

// BeforeInstallPromptEvent 타입 정의
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const T = {
  ko: {
    bookmark: '즐겨찾기 추가',
    install: '바탕화면에 추가',
    installed: '설치 완료!',
    bookmark_tip: '브라우저 주소창 오른쪽 별표(★) 또는 Ctrl+D를 누르세요',
    install_tip: '홈 화면에 KERYX 앱 아이콘이 추가됩니다',
    share: '공유하기',
    copy_link: '링크 복사',
    copied: '복사됨!',
    qr: 'QR코드',
    close: '닫기',
    ios_tip: 'Safari에서 하단 공유 버튼을 누른 후 "홈 화면에 추가"를 선택하세요',
    android_tip: '브라우저 메뉴(⋮)에서 "홈 화면에 추가"를 선택하세요',
  },
  zh: {
    bookmark: '添加书签',
    install: '添加到桌面',
    installed: '安装成功！',
    bookmark_tip: '按浏览器地址栏右侧的星号(★)或 Ctrl+D',
    install_tip: '将KERYX应用图标添加到主屏幕',
    share: '分享',
    copy_link: '复制链接',
    copied: '已复制！',
    qr: '二维码',
    close: '关闭',
    ios_tip: '在Safari中点击底部分享按钮，然后选择"添加到主屏幕"',
    android_tip: '在浏览器菜单(⋮)中选择"添加到主屏幕"',
  },
};

export default function BookmarkInstallBar({ pageTitle, pageTitleZh, pageUrl, lang }: Props) {
  const t = T[lang];
  const title = lang === 'ko' ? pageTitle : pageTitleZh;

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallTip, setShowInstallTip] = useState(false);
  const [showBookmarkTip, setShowBookmarkTip] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [bookmarkBtnRect, setBookmarkBtnRect] = useState<DOMRect | null>(null);
  const [installBtnRect, setInstallBtnRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    // 디바이스 감지
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua);
    const android = /Android/.test(ua);
    const mobile = ios || android;
    setIsIOS(ios);
    setIsAndroid(android);
    setIsMobile(mobile);

    // PWA 설치 이벤트 캡처
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // 이미 설치된 경우 감지
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // PWA 설치 실행
  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else {
      // 모바일에서 수동 안내
      setShowInstallTip(true);
    }
  };

  // 링크 복사
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 폴백: 텍스트 선택
      const el = document.createElement('textarea');
      el.value = pageUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 네이티브 공유 (모바일)
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `KERYX - ${title}`,
          text: `${title} | KERYX 중국 공장 직거래 플랫폼`,
          url: pageUrl,
        });
      } catch {
        // 공유 취소
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="w-full bg-gradient-to-r from-violet-700 to-purple-800 text-white">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* 왼쪽: 페이지 제목 */}
          <div className="flex items-center gap-2 min-w-0">
            <svg className="w-5 h-5 text-violet-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-sm font-medium text-violet-100 truncate">{title}</span>
          </div>

          {/* 오른쪽: 액션 버튼들 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* 즐겨찾기 버튼 */}
            <div className="relative">
              <button
                onClick={(e) => { 
                  setBookmarkBtnRect((e.currentTarget as HTMLButtonElement).getBoundingClientRect());
                  setShowBookmarkTip(!showBookmarkTip); 
                  setShowInstallTip(false); 
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-sm font-medium transition-colors"
                title={t.bookmark}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span className="hidden sm:inline">{t.bookmark}</span>
              </button>

              {/* 즐겨찾기 안내 팝업 - fixed 포지션으로 네비게이션 위에 표시 */}
              {showBookmarkTip && bookmarkBtnRect && (
                <div 
                  className="fixed w-64 bg-white text-gray-800 rounded-xl shadow-2xl p-4 border border-gray-100"
                  style={{ 
                    zIndex: 99999,
                    top: bookmarkBtnRect.bottom + 8,
                    right: window.innerWidth - bookmarkBtnRect.right
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-semibold text-violet-700">{t.bookmark}</p>
                    <button onClick={() => setShowBookmarkTip(false)} className="text-gray-400 hover:text-gray-600 ml-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{t.bookmark_tip}</p>
                  <div className="mt-3 flex items-center gap-2 p-2 bg-violet-50 rounded-lg">
                    <svg className="w-4 h-4 text-violet-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    <span className="text-xs text-violet-700 font-medium truncate">{pageUrl}</span>
                  </div>
                </div>
              )}
            </div>

            {/* 바탕화면 추가 버튼 */}
            {!isInstalled ? (
              <div className="relative">
                <button
                  onClick={(e) => { 
                    setInstallBtnRect((e.currentTarget as HTMLButtonElement).getBoundingClientRect());
                    handleInstall(); 
                    setShowBookmarkTip(false); 
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-violet-700 hover:bg-violet-50 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                  title={t.install}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden sm:inline">{t.install}</span>
                  <span className="sm:hidden">앱</span>
                </button>

                {/* 모바일 설치 안내 팝업 - fixed 포지션으로 네비게이션 위에 표시 */}
                {showInstallTip && installBtnRect && (
                  <div 
                    className="fixed w-72 bg-white text-gray-800 rounded-xl shadow-2xl p-4 border border-gray-100"
                    style={{ 
                      zIndex: 99999,
                      top: installBtnRect.bottom + 8,
                      right: window.innerWidth - installBtnRect.right
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <p className="text-sm font-semibold text-violet-700">{t.install}</p>
                      <button onClick={() => setShowInstallTip(false)} className="text-gray-400 hover:text-gray-600 ml-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    {isIOS && (
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">{t.ios_tip}</p>
                      </div>
                    )}
                    {isAndroid && (
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">{t.android_tip}</p>
                      </div>
                    )}
                    {!isMobile && (
                      <p className="text-xs text-gray-600 leading-relaxed">{t.install_tip}</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 rounded-lg text-sm font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{t.installed}</span>
              </div>
            )}

            {/* 공유/링크 복사 버튼 */}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-sm font-medium transition-colors"
              title={isMobile ? t.share : t.copy_link}
            >
              {isMobile ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
              <span className="hidden sm:inline">
                {copied ? t.copied : (isMobile ? t.share : t.copy_link)}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
