# KERYX 운영자 콘솔·공개 구조 Preview 검증 보고서

> **결론:** 운영자 콘솔과 회사소개·공용 링크 통일을 포함한 기능 브랜치가 최신 Vercel Preview에서 **Ready** 상태로 배포되었습니다. 공개 사이트의 네 축 경로, 로그인 전 사이트맵, 비로그인 관리자 차단은 확인되었습니다. 아직 `main` 병합과 Production 배포는 수행하지 않았습니다.

## 1. 보고 목적과 배포 기준

이 보고서는 기존 B2B 주문·상품·구독 데이터를 삭제하거나 덮어쓰지 않는 전제에서, `feat/operator-console` 브랜치의 공개 구조 단순화 및 운영자 데이터 관리 기능을 Production에 반영할 수 있는지를 검토하기 위해 작성했습니다. 검증 기준은 Vercel Preview 배포 완료, 공개·보호 경로 응답, 코드 구문·타입 검사, 사이트맵 공개 여부입니다.

| 구분 | 기준 값 |
|---|---|
| 대상 브랜치 | `feat/operator-console` |
| 최신 커밋 | `2e4e5ad` — `fix: log retail operator actions` |
| 최신 Preview 별칭 | <https://keryx-git-feat-operator-console-joeunjin1s-projects.vercel.app> |
| 최신 고정 Preview | <https://keryx-donf394lx-joeunjin1s-projects.vercel.app> |
| Vercel 배포 ID | `9FX9Jg2tyKY27whHtF1ULuMKRJmk` |
| Vercel 최종 상태 | **Ready / Latest** |
| Preview 빌드 시간 | 1분 43초 |
| Production 상태 | **미반영** — 대표 승인 전 `main` 병합 금지 |

## 2. 이번 확인·보완 내용

### 2.1 회사소개와 공용 공개 링크 통일

`/about` 페이지는 **“스토리가 있는 제품을 기획하여 공급합니다.”**라는 공개 메시지로 정리됐습니다. 상단에는 `스토어`, `샘플 구독`, `IP 소개`, `회사 소개`의 네 축 메뉴와 KERYX 홈 이동이 표시되며, 본문에서도 자체 디자인 IP, 상품 스토어, 샘플 구독을 하나의 운영 흐름으로 연결합니다.

브랜드 표기는 케릭스 / **KERYX** / 凯瑞 원칙을 따르며, 회사소개에는 KERYX의 그리스어 *kḗrux* 유래와 무역의 메신저라는 의미를 포함합니다. 중국 측 법인 정보는 공개 화면에서 확인되지 않았습니다.

| 확인 항목 | 결과 | 확인 근거 |
|---|---|---|
| `/about` 공개 접근 | 통과 | HTTP 200 |
| 공용 상단 메뉴 | 통과 | 스토어·샘플 구독·IP 소개·회사 소개·홈 링크 렌더링 |
| 세 축 메시지 | 통과 | IP·스토어·샘플 구독 CTA 및 운영 흐름 렌더링 |
| 브랜드 유래 | 통과 | kḗrux 유래 본문 렌더링 |
| 중국 측 법인 정보 노출 | 통과 | 확인된 공개 HTML과 화면에 없음 |
| 언어 전환 버튼 | 표시 확인 | 한국어/중국어 전환 버튼 렌더링 확인; 자동화 브라우저 확장 접근 오류로 클릭 뒤 중국어 본문은 미확인 |

### 2.2 동적 관리자 메일함 API 보강

Vercel Build Log는 초기 배포에서 쿠키 기반 `GET /api/admin/mailbox`를 정적 생성 단계가 처리하려고 한 동적 서버 사용 로그를 표시했습니다. 관리자 권한 또는 세션 구조는 바꾸지 않고, 목록·상세 메일함 API에 `dynamic = 'force-dynamic'` 선언만 추가했습니다.

| 커밋 | 변경 | 결과 |
|---|---|---|
| `49de576` | `/api/admin/mailbox`와 `/api/admin/mailbox/[id]`를 쿠키 인증 기반 동적 경로로 명시 | Preview **Ready**, 오류 표시는 사라지고 경고 1건만 표시 |

### 2.3 공개 사이트맵 보정

기존 미들웨어는 비로그인 요청의 `/sitemap.xml`을 로그인 화면으로 넘길 수 있었습니다. 공개 사이트맵 자체가 검색 엔진·외부 도구에서 접근 불가한 문제이므로, `/sitemap.xml`만 공개 경로에 추가했습니다. 또한 사이트맵의 기본 도메인을 실제 운영 도메인인 `https://www.keryx.kr`로 정정했습니다.

| 커밋 | 변경 | 최종 확인 |
|---|---|---|
| `85be29f` | `/sitemap.xml` 공개 예외 및 사이트맵 기준 도메인 정정 | Preview **Ready**, `/sitemap.xml` HTTP 200, `application/xml` |

사이트맵에는 다음 공개 경로가 `www.keryx.kr` 기준으로 생성됩니다.

| 공개 주소 | 용도 | Preview 응답 |
|---|---|---:|
| `/` | KERYX 홈 | 200 |
| `/shop` | 상품 스토어 | 200 |
| `/sample-subscription` | 샘플·신상품 구독 | 200 |
| `/ip` | 자체 디자인 IP 허브 | 200 |
| `/ip-story` | IP 스토리 | 200 |
| `/ip-serial` | IP 연재 | 200 |
| `/about` | 회사 소개 | 200 |
| `/faq` | 자주 묻는 질문 | 200 |
| `/support` | 지원 안내 | 200 |
| `/terms` | 이용약관 | 200 |
| `/privacy` | 개인정보 처리방침 | 200 |
| `/catalog` | 이전 카탈로그 주소 | 307 → `/shop` |

### 2.4 운영 활동 이력 누락 보강

IP·캐릭터·콘텐츠·미디어·신규 상품·주문 전 발주 등록 API는 기존에도 `operator_activity_log` 기록 함수를 호출하는 것을 코드로 확인했습니다. 그러나 판매 설정 변경, 가격 변경 요청, 가격 승인·반려, 소매 주문 상태 변경은 성공 후 이력이 빠져 있었습니다. 운영 추적의 연속성을 위해 해당 성공 처리 경로에만 공통 기록 함수를 추가했습니다.

| 커밋 | 운영 동작 | 기록 대상 |
|---|---|---|
| `2e4e5ad` | 스토어 판매 조건 변경 | `products` |
| `2e4e5ad` | 판매가 변경 요청 | `retail_price_change_requests` |
| `2e4e5ad` | 판매가 승인·반려 | `retail_price_change_requests` |
| `2e4e5ad` | 소매 주문 상태 변경 | `retail_orders` |

이번 보강은 기존의 가격 변경 이중 승인 DB 함수와 주문 상태 전이 DB 함수를 우회하지 않습니다. 승인·반려는 계속 다른 관리자의 검토를 거쳐야 하며, 신규 코드는 성공한 운영 동작의 기록만 추가합니다.

## 3. 공개·보호 경로 최종 검증

아래 검증은 최신 Preview 별칭에서 비로그인 상태로 수행했습니다. 공개 화면은 HTTP 200이어야 하며, 운영자 화면·관리자 API는 로그인으로 HTTP 307 전환되어야 합니다.

| 구분 | 주소 | 결과 | 비고 |
|---|---|---:|---|
| 공개 | `/about` | 200 | 공용 메뉴·회사소개 렌더링 |
| 공개 | `/ip` | 200 | 공개 IP 허브 렌더링 |
| 공개 | `/shop` | 200 | 스토어 공용 메뉴·장바구니 UI 렌더링 |
| 공개 | `/sample-subscription` | 200 | 샘플 구독 폼 경로 렌더링 |
| 공개 | `/api/public/ip` | 200 | `ips`, `cast`, `content` 안전 응답 |
| 공개 | `/api/retail/products` | 200 | 안전한 공개 상품 API |
| 공개 | `/sitemap.xml` | 200 | 로그인 전환 없이 XML 응답 |
| 전환 | `/catalog` | 307 | `/shop`으로 전환 |
| 보호 | `/admin/ip-studio` | 307 | `/login?next=/admin/ip-studio` |
| 보호 | `/admin/products/new` | 307 | `/login?next=/admin/products/new` |
| 보호 | `/admin/preorder-purchase` | 307 | `/login?next=/admin/preorder-purchase` |
| 보호 | `/admin/operator-activity` | 307 | `/login?next=/admin/operator-activity` |
| 보호 | `/api/admin/operator-activity` | 307 | 로그인 화면으로 전환 |
| 보호 | `/api/admin/mailbox` | 307 | 로그인 화면으로 전환 |

공개 IP API는 현재 `ips: []`, `cast: []`, `content: []`을 반환합니다. 이는 운영자가 공개 상태로 등록한 실제 IP 데이터가 아직 없는 상태이며, `/ip` 화면은 기존 소개 콘텐츠를 fallback으로 제공하도록 설계되어 있습니다. 임의 IP, 상품, 가격, 재고, 주문 데이터는 생성하지 않았습니다.

## 4. 코드 및 배포 검증 결과

| 검증 | 결과 | 세부 내용 |
|---|---|---|
| `node scripts/verify-retail-syntax.mjs` | 통과 | 공개·운영자 기능 관련 64개 변경 파일 구문 확인 |
| `npx tsc --noEmit` | 통과 | TypeScript 타입 검사 통과 |
| `git diff --check` | 통과 | 공백 오류 없음 |
| Vercel Preview | 통과 | 최신 `2e4e5ad` 배포 Ready |
| 로컬 `next build` | 제한 | `Compiled successfully`까지 확인했으나 샌드박스 메모리 압박으로 최종 `.next/BUILD_ID` 산출물은 남지 않음 |
| 최종 빌드 기준 | 통과 | Vercel이 실제 Preview 환경에서 최적화 빌드·서버리스 함수 생성·배포를 완료 |

> **검증 한계:** 관리자 로그인 세션을 이용한 실제 데이터 등록·공개·가격 승인·활동 로그 행 생성은 수행하지 않았습니다. 실제 IP·상품·가격·재고 데이터가 제공되지 않은 상태에서 시험 데이터를 만들면 공개 화면과 운영 DB를 오염시킬 수 있기 때문입니다. 이 흐름은 Production 병합 후 운영자 계정으로 실제 첫 등록 시 검증하거나, 대표가 명시적으로 승인한 전용 테스트 데이터로 분리 검증해야 합니다.

## 5. 데이터·권한·보안 점검

| 검증 항목 | 상태 | 설명 |
|---|---|---|
| 기존 B2B 데이터 보존 | 확인됨 | 이번 커밋은 기존 테이블 삭제·초기화·덮어쓰기를 포함하지 않음 |
| 운영자 권한 | 확인됨 | 신규 운영자 API는 로그인 후 `user_profiles.kind = 'admin'` 기준을 사용 |
| 공개 API 내부 정보 비노출 | 확인됨 | 공개 IP·소매 상품 API를 분리하며 원가·공장 연락처를 공개 응답에 포함하지 않는 구조 |
| 가격 변경 이중 승인 | 확인됨 | 기존 판매가 변경은 요청자와 승인자가 분리된 DB RPC 흐름 유지 |
| 주문 상태 전이 | 확인됨 | 기존 DB RPC를 통한 허용 상태 전이만 사용 |
| 활동 이력 | 코드 보강 완료 | 신규 운영자 등록·수정 및 소매 운영 변경이 `operator_activity_log` 기록 경로를 가짐 |
| 인증·권한·환경변수 | 변경 없음 | 비밀번호, 계정, API 키, 시크릿, RLS 정책은 이번 커밋에서 변경하지 않음 |

전달된 GitHub 인증 정보는 기능 브랜치 푸시에만 일시 사용했고, 매 푸시 직후 임시 파일을 삭제했습니다. 토큰 원문은 코드, Git 커밋, 보고서에 기록하지 않았습니다. 다만 대화에 노출된 개인 접근 토큰은 작업 종료 뒤 GitHub에서 **폐기 후 새 토큰 발급**을 권장합니다.

## 6. Production 반영 전 남은 확인 사항

Production 반영은 대표의 명시적 승인이 필요한 단계입니다. 승인 전에 `main` 병합이나 Production 배포는 하지 않습니다.

| 항목 | 상태 | 다음 조치 |
|---|---|---|
| 기능 브랜치 Preview | 완료 | 최신 Preview 링크에서 최종 화면 검토 |
| 공개·보호 경로 | 완료 | 본 보고서 표의 HTTP 결과 확인 |
| 실제 IP 등록 → 공개 반영 | 미실행 | 운영자 로그인 후 실제 첫 IP 데이터로 확인 |
| 상품 등록 → 판매 조건 공개 | 미실행 | 실제 상품명·이미지·판매가·배송비·재고 제공 후 진행 |
| 판매가 변경 요청 → 타 관리자 승인 | 미실행 | 서로 다른 관리자 계정 또는 승인된 테스트 계정 필요 |
| 활동 이력 실제 행 생성 | 미실행 | 위 실제 운영 동작 후 `/admin/operator-activity`에서 확인 |
| 중국어 전환 클릭 검증 | 미실행 | 일반 브라우저에서 공용 화면 한 번 확인 |
| 토스페이먼츠 실결제 | 보류 | 테스트·라이브 키 및 대표의 별도 결제 오픈 승인 필요 |
| Production 병합 | 대기 | 대표 승인 후 PR #2를 `main`에 병합하고 운영 도메인 재검증 |

## 7. 승인 요청

대표님이 최신 Preview에서 회사소개·공용 링크·운영자 콘솔 구성을 확인한 뒤 아래 문구로 승인해 주시면, Pull Request #2를 `main`에 병합하고 Vercel Production 배포 상태 및 운영 도메인 경로를 다시 검증하겠습니다.

> **“PR #2 Production 병합 및 운영 배포를 승인합니다.”**

## References

[1] [최신 Preview 별칭](https://keryx-git-feat-operator-console-joeunjin1s-projects.vercel.app)

[2] [최신 Preview 고정 주소](https://keryx-donf394lx-joeunjin1s-projects.vercel.app)

[3] [Vercel Preview 배포 목록](https://vercel.com/joeunjin1s-projects/keryx/deployments?environment=preview)

[4] [최신 Preview 배포 상세](https://vercel.com/joeunjin1s-projects/keryx/9FX9Jg2tyKY27whHtF1ULuMKRJmk)

[5] [KERYX GitHub Pull Request #2](https://github.com/joeunjin1/keryx/pull/2)
