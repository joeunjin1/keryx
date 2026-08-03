# KERYX 페이지 생성 템플릿

## 필수 규칙: 모든 신규 페이지는 한국어/중국어 동시 지원

### 방법 1: useT() 훅 사용 (권장)

```tsx
'use client';
import { useT } from '@/lib/useTranslation';

export default function MyPage() {
  const t = useT();
  
  return (
    <div>
      <h1>{t('페이지 제목', '页面标题')}</h1>
      <button>{t('저장', '保存')}</button>
      <input placeholder={t('검색어 입력', '输入搜索词')} />
    </div>
  );
}
```

### 방법 2: useAutoT() 훅 사용 (번역 사전 자동 조회)

```tsx
'use client';
import { useAutoT } from '@/lib/useTranslation';

export default function MyPage() {
  const t = useAutoT();
  
  return (
    <div>
      <h1>{t('주문 목록')}</h1>  {/* 사전에서 '订单列表' 자동 조회 */}
      <button>{t('저장')}</button>  {/* 사전에서 '保存' 자동 조회 */}
    </div>
  );
}
```

### 방법 3: LangText 컴포넌트 사용 (인라인 텍스트)

```tsx
import LangText from '@/components/layout/LangText';

<LangText ko="주문 목록" zh="订单列表" />
```

## 번역 사전 업데이트 방법

새 문자열이 생기면 `src/lib/translations.json`에 추가:

```json
{
  "새 한국어 문자열": "新中文翻译"
}
```

## 주요 번역 참고

| 한국어 | 중국어 |
|--------|--------|
| 저장 | 保存 |
| 취소 | 取消 |
| 삭제 | 删除 |
| 수정 | 修改 |
| 추가 | 添加 |
| 검색 | 搜索 |
| 목록 | 列表 |
| 상세 | 详情 |
| 완료 | 完成 |
| 대기중 | 待处理 |
| 진행중 | 进行中 |
| 취소됨 | 已取消 |
| 바이어 | 买家 |
| 공장 | 工厂 |
| 시장조사 | 市场调研 |
| 샘플제작 | 样品制作 |
| 공장매칭 | 工厂匹配 |
| 보고서 | 报告 |
| 신청 | 申请 |
| 견적 | 报价 |
| 납기 | 交期 |
| 단가 | 单价 |
| MOQ | MOQ |
