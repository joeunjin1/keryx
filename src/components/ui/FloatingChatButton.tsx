"use client";
/**
 * 플로팅 카카오톡 상담 버튼
 * 모든 공개 페이지 우측 하단에 표시
 * 클릭 시 카카오톡 채널 채팅으로 이동
 */
import { useState } from "react";

export function FloatingChatButton() {
  const [isHovered, setIsHovered] = useState(false);

  // 카카오톡 채널 URL (실제 채널 URL로 교체 필요)
  const kakaoChannelUrl = "https://pf.kakao.com/_keryx";

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* 말풍선 툴팁 */}
      {isHovered && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 animate-fade-in max-w-[200px]">
          <p className="text-sm font-semibold text-gray-800">무료 상담하기</p>
          <p className="text-xs text-gray-500 mt-0.5">카카오톡으로 편하게 문의하세요</p>
        </div>
      )}

      {/* 플로팅 버튼 */}
      <a
        href={kakaoChannelUrl}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="w-14 h-14 rounded-full bg-[#FEE500] shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 flex items-center justify-center group"
        aria-label="카카오톡 상담"
      >
        {/* 카카오톡 아이콘 */}
        <svg
          viewBox="0 0 24 24"
          className="w-7 h-7 text-[#3C1E1E]"
          fill="currentColor"
        >
          <path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.65 1.726 4.98 4.338 6.32-.14.49-.904 3.177-.937 3.388 0 0-.018.152.08.21.098.058.213.014.213.014.281-.039 3.252-2.14 3.765-2.5.83.12 1.69.183 2.541.183 5.523 0 10-3.463 10-7.691S17.523 3 12 3z" />
        </svg>
      </a>
    </div>
  );
}

export default FloatingChatButton;
