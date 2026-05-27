import { SettingToggleRow, SettingsPageCard } from '@/sample/settings/components/settings-form';

export function NotificationsSettingsPage() {
  return (
    <SettingsPageCard
      title="알림"
      description="운영 이벤트, 보안 이벤트, 제품 업데이트 수신 방식을 선택합니다."
    >
      <div className="grid gap-3">
        <SettingToggleRow
          title="커뮤니케이션 이메일"
          description="팀 초대, 권한 변경, 조직 공지를 이메일로 받습니다."
          defaultChecked
        />
        <SettingToggleRow
          title="보안 이메일"
          description="로그인 실패, 새 기기 접속, API 키 변경 같은 보안 이벤트를 즉시 받습니다."
          defaultChecked
        />
        <SettingToggleRow
          title="제품 업데이트"
          description="Sample Admin 레퍼런스에 추가된 화면과 컴포넌트 변경 내역을 받습니다."
        />
        <SettingToggleRow
          title="푸시 알림"
          description="브라우저 권한이 허용된 경우 긴급 작업과 멘션을 푸시로 받습니다."
        />
      </div>
    </SettingsPageCard>
  );
}
