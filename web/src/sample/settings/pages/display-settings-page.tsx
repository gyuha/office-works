import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { SettingsPageCard } from '@/sample/settings/components/settings-form';
import { displayItems } from '@/sample/settings/data/settings-options';

export function DisplaySettingsPage() {
  return (
    <SettingsPageCard
      title="디스플레이"
      description="사이드바와 대시보드 빠른 접근 영역에 표시할 항목을 선택합니다."
    >
      <div className="grid gap-3">
        {displayItems.map((item, index) => (
          <Label key={item} className="justify-between rounded-lg border p-4">
            <span className="grid gap-1">
              <span className="font-medium text-sm leading-none">{item}</span>
              <span className="text-muted-foreground text-xs">사이드바 항목 #{index + 1}</span>
            </span>
            <Checkbox defaultChecked={index < 6} />
          </Label>
        ))}
      </div>
    </SettingsPageCard>
  );
}
