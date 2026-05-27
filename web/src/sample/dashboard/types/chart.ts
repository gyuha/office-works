/**
 * 대시보드 overview 차트(월별 매출 추이) 데이터 모델.
 *
 * shadcn-admin 의 Overview 컴포넌트가 사용하는 12 개월 BarChart 데이터를
 * 단일 타입으로 표현한다. 라벨(label)은 i18n locale 별로 다르게 들어올 수 있으므로
 * 차트 컴포넌트는 표시 책임만 갖고, 데이터 책임은 data 모듈에서 분리한다.
 */
export interface OverviewChartPoint {
  /** 월 인덱스 (0=Jan, 11=Dec). i18n / 정렬에 사용. */
  monthIndex: number;
  /** X 축 표시 라벨 (예: "1월", "Jan"). 이미 locale 화 된 문자열. */
  label: string;
  /** 해당 월 매출 합계 (KRW 정수, 천 단위 콤마 없는 raw 숫자). */
  total: number;
}
