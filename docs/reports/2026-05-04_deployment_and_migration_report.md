# KERYX 배포 복구 및 DB 마이그레이션 완료 보고서

**작성일**: 2026-05-04  
**작성자**: Manus AI  
**상태**: ✅ 완료

---

## 1. 배포 Blocked 원인 및 해결

### 원인
- **문제**: 모든 최근 커밋(약 15개)이 Vercel에서 "Blocked" 상태로 배포되지 않음
- **원인**: Git 커밋 이메일이 `joeunjin1@github.com`으로 설정되어 있었으나, GitHub 계정 이메일은 `gjtrade@naver.com`이어서 Vercel이 계정 불일치로 배포를 차단

### 해결
```bash
# Git 이메일 수정
git config --global user.email "gjtrade@naver.com"
git config user.email "gjtrade@naver.com"

# 새 커밋 push (빈 커밋으로 트리거)
git commit -m "fix: Git 이메일 수정 (gjtrade@naver.com) - Vercel 배포 차단 해제"
git push origin main
```

### 결과
- 커밋 `0d66827` 배포 성공 (Production Current Ready, 1m 4s)
- 이후 모든 커밋도 정상 배포 가능 상태

---

## 2. Supabase DB 마이그레이션 적용

### 문제
기존 마이그레이션 파일들이 올바른 순서로 실행되지 않아 테이블 생성 실패:
- `20260501_subscriptions.sql` - INSERT만 있고 테이블 생성 없음 (실행 순서 문제)
- `20260504_subscription_plans_full.sql` - `updated_at` 컬럼 없는 테이블에 업데이트 시도
- `20260504_rls_security_hardening.sql` - `auth` 스키마 권한 없음

### 해결
기존 5개 파일을 백업하고 통합 마이그레이션 파일 1개로 재작성:

**파일**: `supabase/migrations/20260504000000_keryx_subscriptions_complete.sql`

### 생성된 테이블

| 테이블명 | 설명 | 상태 |
|---|---|---|
| `subscription_plans` | 구독 플랜 정의 (5단계) | ✅ 생성 완료 |
| `subscriptions` | 셀러 구독 신청/관리 | ✅ 생성 완료 |
| `subscription_payments` | 구독 결제 내역 | ✅ 생성 완료 |

### 삽입된 구독 플랜 데이터

| ID | 이름 | 월 가격 (CNY) | 연 가격 (CNY) |
|---|---|---|---|
| `free` | 무료 | 0 | 0 |
| `basic` | 베이직 | 300 | 2,880 |
| `premium` | 프리미엄 | 500 | 4,800 |
| `vip_pro` | VIP PRO | 800 | 7,680 |
| `enterprise` | 엔터프라이즈 | 문의 | 문의 |

### sellers 테이블 추가 컬럼
- `usage_factory_match` - 공장 매칭 사용량
- `usage_market_research` - 시장조사 사용량
- `usage_catalog_view` - 카탈로그 열람 사용량
- `usage_reset_at` - 마지막 사용량 리셋 시각

---

## 3. 최종 배포 상태

| 배포 ID | 커밋 | 상태 | 빌드 시간 |
|---|---|---|---|
| `6sSvf63kd` | `c20d909` (마이그레이션 정리) | ✅ Production Current Ready | 49s |
| `NJaLj1sPK` | `0d66827` (Git 이메일 수정) | ✅ Ready | 1m 4s |

---

## 4. 재발 방지 조치

### Git 이메일 설정 확인 방법
```bash
git config --list | grep email
# 결과: user.email=gjtrade@naver.com
```

### Vercel 배포 차단 시 확인 사항
1. Git 커밋 이메일이 GitHub 계정 이메일과 일치하는지 확인
2. `git config user.email "gjtrade@naver.com"` 으로 수정
3. 새 커밋 push 후 Vercel 배포 확인

### Supabase 마이그레이션 원칙
- 마이그레이션 파일은 **단일 파일**로 통합하여 실행 순서 문제 방지
- `auth` 스키마에 함수 생성 불가 → `public` 스키마 사용
- ENUM 타입 값은 실제 DB 정의 확인 후 사용

---

## 5. 현재 사이트 상태

- **사이트 URL**: https://www.keryx.kr
- **Supabase 프로젝트**: https://iqfcfpkztoyuzbeqodbq.supabase.co
- **GitHub 저장소**: https://github.com/joeunjin1/keryx

---

*이 보고서는 2026-05-04 배포 복구 작업 완료 후 자동 생성되었습니다.*
