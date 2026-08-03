# KERYX 개발자 노트 (Developer Notes)

> 이 파일은 KERYX 프로젝트의 중요한 설정 정보, 트러블슈팅 기록, 계정 정보를 보관합니다.
> 변경 사항이 생길 때마다 이 파일을 업데이트하세요.

---

## 1. GitHub 설정

| 항목 | 값 |
|------|-----|
| **GitHub 계정** | `joeunjin1` |
| **GitHub 이메일** | `gjtrade@naver.com` |
| **저장소** | `https://github.com/joeunjin1/keryx` |
| **기본 브랜치** | `main` |

> ⚠️ **중요**: git commit 시 반드시 `gjtrade@naver.com` 이메일을 사용해야 합니다.
> 다른 이메일(`jo@keryx.kr` 등)로 커밋하면 Vercel 배포가 **Blocked** 됩니다.

```bash
# 매 세션 시작 시 반드시 설정
git config user.email "gjtrade@naver.com"
git config user.name "joeunjin1"
```

---

## 2. Vercel 배포 설정

| 항목 | 값 |
|------|-----|
| **Vercel 프로젝트명** | `keryx` |
| **Production URL** | `https://keryx-one.vercel.app` |
| **커스텀 도메인** | `https://www.keryx.kr` |
| **배포 방식** | GitHub `main` 브랜치 push → 자동 배포 |
| **배포 차단 이유 (해결됨)** | 커밋 이메일이 GitHub 계정 이메일과 불일치 |

---

## 3. Supabase 설정

| 항목 | 값 |
|------|-----|
| **Supabase URL** | `https://iqfcfpkztoyuzbeqodbq.supabase.co` |
| **프로젝트 이름** | KERYX |

---

## 4. 주요 계정 정보

### 관리자 계정
| 항목 | 값 |
|------|-----|
| **이메일** | `jo@keryx.kr` |
| **비밀번호** | `Keryx2024!` |
| **역할** | admin |
| **접속 URL** | `https://keryx-one.vercel.app/login` → `/admin` |

### MD 계정
| 이메일 | 이름 | 비밀번호 |
|--------|------|---------|
| `joeumjin@keryx.com` | 조은진 | `Keryx2024!` |
| `park.jihoon.md@keryx.kr` | 박지훈 | `Keryx2024!` |

### 테스트 계정
| 이메일 | 역할 | 비밀번호 |
|--------|------|---------|
| `seller-test@suivea.com` | 바이어 | `Keryx2024!` |
| `factory-test@suivea.com` | 공장 | `Keryx2024!` |
| `r@keryx.kr` | 검수관 | `Keryx2024!` |

---

## 5. 사이트 맵 (주요 경로)

### 공개 페이지
- `/` - 메인 랜딩 페이지
- `/shop` - 쇼핑몰
- `/landing/promotional-bags` - 판촉 가방 공장 랜딩 페이지
- `/login` - 로그인
- `/auth/reset-password` - 비밀번호 재설정

### 관리자 포털 (`/admin`)
- `/admin` - 대시보드
- `/admin/members/sellers` - 바이어 회원 관리
- `/admin/members/mds` - MD 관리
- `/admin/factories` - 공장 관리
- `/admin/products` - 상품 관리
- `/admin/orders` - 주문 관리
- `/admin/landing-pages` - 랜딩 페이지 관리
- `/admin/md-performance` - MD 성과 분석

### 바이어 포털 (`/seller`)
- `/seller` - 대시보드
- `/seller/md-chat` - MD 소통 (통합 소통 허브)
- `/seller/orders` - 거래 관리
- `/seller/inspections` - 검수 보고서
- `/seller/payments` - 결제 내역

### MD 포털 (`/md`)
- `/md` - 대시보드
- `/md/communications` - 통합 소통 관리
- `/md/orders` - 발주 관리
- `/md/factories` - 공장 관리

### 공장 포털 (`/factory`)
- `/factory` - 대시보드
- `/factory/products` - 제품 목록

---

## 6. 트러블슈팅 기록

### [2026-05-13] Vercel 배포 Blocked 문제
- **증상**: `/landing/promotional-bags` 페이지 404 에러
- **원인**: git commit 이메일이 `jo@keryx.kr`로 설정되어 GitHub 계정(`gjtrade@naver.com`)과 불일치 → Vercel이 배포 차단
- **해결**: `git config user.email "gjtrade@naver.com"` 으로 변경 후 빈 커밋 push

### [2026-05-13] MD communications 페이지 함수 중복 선언
- **증상**: 빌드 오류 - `setupRealtime` 함수 미선언 오류
- **원인**: Python 스크립트로 파일 편집 시 함수 블록 중복 삽입
- **해결**: `git checkout -- src/app/md/communications/page.tsx` 로 원본 복원 후 재작업

---

## 7. 주요 외부 API 연동

| 서비스 | 용도 | 키 위치 |
|--------|------|---------|
| **Supabase** | DB, Auth, Storage, Realtime | Vercel 환경변수 |
| **Vercel** | 호스팅, 자동 배포 | Vercel 대시보드 |

---

*마지막 업데이트: 2026-05-13*
