import { useTheme } from '@/hooks/use-theme';
import { useSampleThemePreset } from '@/sample/lib/sample-theme';
import {
  ChoiceCard,
  NativeSelectField,
  SettingsPageCard,
} from '@/sample/settings/components/settings-form';
import {
  fontOptions,
  themeModeOptions,
  themePresetOptions,
} from '@/sample/settings/data/settings-options';
const presetSwatches: Record<string, string> = {
  default: 'bg-zinc-900 dark:bg-zinc-50',
  blue: 'bg-blue-600',
  green: 'bg-emerald-600',
  orange: 'bg-orange-500',
  red: 'bg-red-600',
};

export function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { preset, setPreset } = useSampleThemePreset();

  return (
    <SettingsPageCard
      title="화면 설정"
      description="다크 모드, 기본 폰트, shadcn-admin 스타일 컬러 프리셋을 조정합니다."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <NativeSelectField
          id="appearance-mode"
          label="테마 모드"
          defaultValue={theme}
          options={themeModeOptions}
          description="저장 버튼과 별개로 아래 버튼에서 즉시 전환할 수 있습니다."
        />
        <NativeSelectField
          id="appearance-font"
          label="폰트"
          defaultValue="inter"
          options={fontOptions}
          description="포팅 레퍼런스용 폰트 선택 UI 입니다."
        />
      </div>
      <div className="grid gap-3">
        <div>
          <h2 className="font-medium text-sm">빠른 모드 전환</h2>
          <p className="text-muted-foreground text-xs">
            버튼 클릭 즉시 document root 의 dark class 가 갱신됩니다.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {themeModeOptions.map((item) => (
            <ChoiceCard
              key={item.value}
              item={item}
              selected={theme === item.value}
              onSelect={() => setTheme(item.value)}
            />
          ))}
        </div>
      </div>
      <div className="grid gap-3">
        <div>
          <h2 className="font-medium text-sm">컬러 프리셋</h2>
          <p className="text-muted-foreground text-xs">
            Default 와 4가지 포인트 컬러를 제공하는 Sample Admin picker 입니다.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {themePresetOptions.map((item) => (
            <ChoiceCard
              key={item.value}
              item={item}
              selected={preset === item.value}
              onSelect={() => setPreset(item.value as typeof preset)}
              swatchClassName={presetSwatches[item.value]}
            />
          ))}
        </div>
      </div>
    </SettingsPageCard>
  );
}
