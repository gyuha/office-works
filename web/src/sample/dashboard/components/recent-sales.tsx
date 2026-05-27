import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { recentSales as defaultRecentSales } from '@/sample/dashboard/data/recent-sales';
import type { RecentSale } from '@/sample/dashboard/types/recent-sale';

interface RecentSalesProps {
  /** 외부에서 다른 mock 셋을 주입하고 싶을 때 사용. 미지정 시 기본 5 건을 사용한다. */
  sales?: readonly RecentSale[];
}

/**
 * shadcn-admin dashboard 의 "최근 판매(Recent Sales)" 패널.
 *
 * 5 명의 사용자(아바타 + 이름 + 이메일) 와 결제 금액을 세로 리스트로 보여준다.
 * 별도 사이드 이펙트 없이 props 또는 기본 mock 데이터(`recentSales`) 만 받으므로
 * 다른 프로젝트로 복사 시 데이터/타입 파일과 함께 가져오면 즉시 동작한다.
 */
export function RecentSales({ sales = defaultRecentSales }: RecentSalesProps) {
  return (
    <ul className="space-y-6">
      {sales.map((sale) => (
        <li key={sale.id} className="flex items-center gap-4">
          <Avatar className="size-9">
            <AvatarImage src={sale.avatarUrl} alt={sale.name} />
            <AvatarFallback>{sale.initials}</AvatarFallback>
          </Avatar>
          <div className="grid min-w-0 flex-1 gap-1">
            <p className="truncate text-sm font-medium leading-none">{sale.name}</p>
            <p className="truncate text-sm text-muted-foreground">{sale.email}</p>
          </div>
          <div className="shrink-0 text-sm font-medium tabular-nums">{sale.amount}</div>
        </li>
      ))}
    </ul>
  );
}
