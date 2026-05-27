import {
  NativeSelectField,
  SettingsPageCard,
  TextField,
} from '@/sample/settings/components/settings-form';
import { languageOptions } from '@/sample/settings/data/settings-options';

export function AccountSettingsPage() {
  return (
    <SettingsPageCard
      title="계정"
      description="개인 계정 정보와 관리자 콘솔 기본 언어를 설정합니다."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <TextField id="account-first-name" label="이름" defaultValue="Gyuha" />
        <TextField id="account-last-name" label="성" defaultValue="Kim" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField id="account-birthday" type="date" label="생년월일" defaultValue="1992-04-18" />
        <NativeSelectField
          id="account-language"
          label="언어"
          defaultValue="ko"
          options={languageOptions}
          description="Sample Admin 의 i18n locale 연동 데모입니다."
        />
      </div>
      <TextField
        id="account-timezone"
        label="시간대"
        defaultValue="Asia/Seoul"
        description="날짜·시간 mock 데이터 표시 기준입니다."
      />
    </SettingsPageCard>
  );
}
