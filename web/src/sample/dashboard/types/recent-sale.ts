/**
 * Dashboard 우측 "최근 판매(Recent Sales)" 패널의 1 개 거래 모델.
 *
 * shadcn-admin 의 RecentSales 컴포넌트(아바타 + 이름/이메일 + 금액)를
 * 단일 데이터 형태로 추상화한다. 포맷팅(₩, $, 천단위 콤마 등)은
 * 데이터 생성 단계에서 미리 처리해 컴포넌트는 표시 책임만 갖는다.
 */
export interface RecentSale {
  /** React key + i18n key suffix 등에 사용. */
  id: string;
  /** 표시할 사용자 이름 (예: "홍 길동", "Olivia Martin"). */
  name: string;
  /** 이름 약자 fallback (아바타 이미지 로딩 실패 시 노출, 2 글자). */
  initials: string;
  /** 사용자 이메일. */
  email: string;
  /** 결제 금액의 사전 포맷 문자열 (예: "+₩1,999,000"). */
  amount: string;
  /** 아바타 이미지 URL. faker.image.avatar() 결과를 그대로 사용. */
  avatarUrl: string;
}
