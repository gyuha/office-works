import { sampleBrandUser } from '@/sample/lib/branding';
import {
  SettingsPageCard,
  TextField,
  TextareaField,
} from '@/sample/settings/components/settings-form';

export function ProfileSettingsPage() {
  return (
    <SettingsPageCard
      title="프로필"
      description="다른 사용자에게 표시되는 공개 프로필 정보를 관리합니다."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <TextField id="profile-name" label="이름" defaultValue={sampleBrandUser.name} />
        <TextField id="profile-username" label="사용자명" defaultValue="sample-admin" />
      </div>
      <TextField
        id="profile-email"
        type="email"
        label="공개 이메일"
        defaultValue={sampleBrandUser.email}
        description="프로필 카드와 담당자 표시 영역에 사용됩니다."
      />
      <TextareaField
        id="profile-bio"
        label="소개"
        defaultValue="운영 대시보드, 사용자 관리, 데이터 테이블 레퍼런스를 검수합니다."
        description="최대 160자까지 입력하는 공개 소개 문구입니다."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <TextField id="profile-url-1" label="URL 1" defaultValue="https://sample-admin.local" />
        <TextField id="profile-url-2" label="URL 2" placeholder="https://example.com" />
      </div>
    </SettingsPageCard>
  );
}
