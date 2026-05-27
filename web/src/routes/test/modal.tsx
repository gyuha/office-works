import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import useModal from '@/stores/modal-store';
import { createFileRoute } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useRef } from 'react';

export const Route = createFileRoute('/test/modal')({
  component: ModalTestPage,
});

function ModalTestPage() {
  const { openModal, closeModal, closeAllModal, modalCount } = useModal();
  const portalTargetRef = useRef<HTMLDivElement>(null);

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <h1 className="text-2xl font-bold">Modal 테스트</h1>
      <p className="text-muted-foreground">
        열린 모달 수: <span className="font-mono font-bold">{modalCount()}</span>
      </p>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Alert 모달</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              openModal('간단한 alert 모달입니다.');
            }}
          >
            기본 Alert
          </Button>
          <Button
            onClick={() => {
              openModal({
                alert: '삭제하시겠습니까?',
                title: '삭제 확인',
                txtCancel: '아니오',
                handleOk: () => {
                  alert('삭제 완료!');
                  closeModal();
                },
              });
            }}
          >
            확인/취소 Alert
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Content 모달</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              openModal({
                title: '상세 정보',
                content: '이것은 content 모달입니다. 더 긴 텍스트도 표시할 수 있습니다.',
                size: 'md',
              });
            }}
          >
            Content 모달 (md)
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              openModal({
                title: '정보 포함',
                info: 'SELECT * FROM users WHERE id = 1;',
                content: '쿼리 결과를 확인하세요.',
                size: 'lg',
              });
            }}
          >
            Info + Content 모달 (lg)
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Form 모달</h2>
        <Button
          variant="secondary"
          onClick={() => {
            openModal({
              title: '이메일 입력',
              form: (
                <div className="space-y-3">
                  <label htmlFor="test-email" className="block text-sm font-medium">
                    이메일
                  </label>
                  <input
                    id="test-email"
                    type="email"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="test@example.com"
                  />
                  <Button size="sm" onClick={closeModal}>
                    제출
                  </Button>
                </div>
              ),
            });
          }}
        >
          Form 모달
        </Button>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Custom 모달</h2>
        <Button
          variant="outline"
          onClick={() => {
            openModal({
              custom: (
                <div className="space-y-4 text-center">
                  <div className="text-4xl">🎉</div>
                  <h3 className="text-xl font-bold">커스텀 모달</h3>
                  <p className="text-muted-foreground">원하는 어떤 내용이든 넣을 수 있습니다.</p>
                  <Button onClick={closeModal}>닫기</Button>
                </div>
              ),
              size: 'sm',
              hideBottomButton: true,
              // biome-ignore lint/suspicious/noExplicitAny: CustomModalProps does not include ModalHandleProps; legacy escape hatch from temp/
            } as any);
          }}
        >
          Custom 모달
        </Button>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">사이즈별 모달</h2>
        <div className="flex flex-wrap gap-2">
          {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
            <Button
              key={size}
              variant="outline"
              size="sm"
              onClick={() =>
                openModal({ alert: `${size} 사이즈 모달`, size, title: `Size: ${size}` })
              }
            >
              {size}
            </Button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">다중 모달 (스택)</h2>
        <Button
          onClick={() => {
            openModal({ alert: '첫 번째 모달', title: '모달 1' });
            setTimeout(() => {
              openModal({ alert: '두 번째 모달 (위에 쌓임)', title: '모달 2' });
            }, 300);
            setTimeout(() => {
              openModal({ alert: '세 번째 모달!', title: '모달 3' });
            }, 600);
          }}
        >
          3개 모달 열기
        </Button>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">ESC 방지 모달</h2>
        <Button
          variant="destructive"
          onClick={() => {
            openModal({
              alert: 'ESC 키로 닫을 수 없습니다. 확인 버튼을 눌러주세요.',
              title: 'ESC 비활성화',
              disabledEscKey: true,
              backdropDismiss: true,
              handleOk: () => closeModal(),
            });
          }}
        >
          ESC 비활성화 모달
        </Button>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Portal 모달</h2>
        <p className="text-muted-foreground text-sm">
          portalTarget을 지정하면 모달창이 해당 컨테이너의 React 트리 내에서 렌더링됩니다.
        </p>
        <div className="inline-flex">
          <Button
            variant="outline"
            className={cn('flex items-center gap-2')}
            onClick={() => {
              openModal(
                {
                  title: '새 채팅채널 만들기',
                  custom: (
                    <div className="space-y-4 p-2">
                      <div className="space-y-2">
                        <label htmlFor="channel-name" className="text-sm font-medium">
                          채널 이름
                        </label>
                        <Input id="channel-name" placeholder="채널 이름을 입력하세요" />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={closeModal}>
                          취소
                        </Button>
                        <Button size="sm" onClick={closeModal}>
                          만들기
                        </Button>
                      </div>
                    </div>
                  ),
                  size: 'sm',
                  hideBottomButton: true,
                },
                false,
                { portal: true, portalTarget: portalTargetRef }
              );
            }}
          >
            <Plus className="h-4 w-4" />
            <span>Portal 모달 열기</span>
          </Button>
          <div ref={portalTargetRef} />
        </div>
      </section>

      <div className="pt-4">
        <Button variant="secondary" onClick={closeAllModal} className="w-full">
          모든 모달 닫기
        </Button>
      </div>
    </div>
  );
}
