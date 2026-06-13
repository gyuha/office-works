# Tiptap을 프로젝트 표준 리치텍스트 에디터로 채택한다

## Status
accepted

## 결정
신규 리치텍스트 입력은 **Tiptap**(ProseMirror 기반, 헤드리스) 으로 구현하며, 단일 공용 컴포넌트 `web/src/components/ui/rich-text-editor.tsx`를 통해 사용한다. 리치텍스트 콘텐츠는 **HTML 문자열**로 저장하고, 렌더(읽기 전용 표시) 시 **sanitize**(예: `isomorphic-dompurify`)로 XSS를 방어한다.

기존에 자체 제작된 `contentEditable` + `execCommand` 에디터 2곳(`approval.tsx` 전자결재 양식, `projects.tsx`의 `RichTextEditor`)은 **이번 작업에서 건드리지 않고 그대로 둔다.** 다만 앞으로의 신규 리치텍스트와 두 에디터의 리팩터링은 이 공용 컴포넌트로 수렴시키는 것을 표준으로 삼는다.

## 맥락 / 왜
구성원 메모 기능에 리치텍스트 입력이 필요해지면서 "어떤 에디터를 쓸 것인가"를 정해야 했다. 현재 코드베이스에는 이미 두 개의 서로 다른 자체 에디터가 `execCommand` 기반으로 흩어져 있다. `document.execCommand`는 **deprecated**이고 브라우저별 동작이 제각각이라 유지보수 부채다. 표준을 정하지 않으면 메모용 세 번째 에디터가 또 파편으로 추가된다.

이 결정은 의존성 트리(prosemirror 일가)를 영구히 들이고, 이후 모든 리치텍스트 작업의 기본 토대가 되므로 되돌리기 비용이 크다 — 그래서 ADR로 남긴다.

## 고려한 대안
- **`contentEditable` + `execCommand` 유지** — 의존성 0. 그러나 deprecated API, 브라우저별 불일치, 선택영역/IME 버그가 잦고 확장이 어렵다. 부채를 늘리므로 기각.
- **Lexical (Meta)** — 성능·React 친화적이나 비교적 신생으로 API 변동성이 있고 플러그인 생태계가 Tiptap보다 얕다.
- **Slate** — 매우 유연하나 보일러플레이트가 많고 안정성·중첩 구조 버그 경험담이 많다.
- **Tiptap (채택)** — ProseMirror 위의 성숙한 추상화, 문서화 우수, 1급 React 바인딩(`@tiptap/react`), 모듈식 확장(StarterKit), 헤드리스라 기존 Tailwind/cva 스타일과 충돌 없음. 코어 MIT(일부 Pro 확장만 유료, 메모 요건엔 불필요).

## 결과
- prosemirror 의존성 트리가 번들에 추가된다(번들 크기 증가 — 메모/향후 에디터 가치로 상쇄).
- 콘텐츠를 HTML로 저장하므로 **렌더 지점마다 sanitize가 필수**다. sanitize 없이 `dangerouslySetInnerHTML`로 메모를 그리면 저장형 XSS가 열린다.
- 당분간 `execCommand` 에디터 2곳과 **공존**한다(파편화 일시적). 이를 Tiptap으로 옮기는 것은 별도 후속 작업이며, 이 표준 채택이 그 방향을 정한다.
- StarterKit에는 밑줄(underline)이 기본 포함되지 않으므로 `@tiptap/extension-underline`를 별도로 추가한다.
- 나중에 저장 포맷을 HTML→Tiptap JSON으로 바꾸려면 기존 메모 데이터 변환 마이그레이션이 필요하다(이 결정의 HTML 선택을 뒤집는 작업).
