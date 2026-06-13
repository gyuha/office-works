import { type ChainedCommands, EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import DOMPurify from 'isomorphic-dompurify';
import { useEffect } from 'react';

import { cn } from '@/lib/utils';

/*
 * 프로젝트 표준 리치텍스트 에디터 (Tiptap, ADR-0007).
 * 콘텐츠는 HTML 문자열로 주고받으며, 표시(RichTextView)는 sanitize 후 렌더한다.
 * StarterKit(v3)에 Bold/Italic/Underline/Strike/Heading/Link/목록이 모두 포함된다.
 */

// StarterKit의 자동 링크로 생성된 <a>의 reverse-tabnabbing 차단 — 모든 앵커에 rel 강제.
// 모듈 로드 시 1회만 등록(렌더마다 등록하면 훅이 누적된다).
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.nodeName === 'A') {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

// 에디터 본문과 읽기 전용 뷰가 동일하게 보이도록 공유하는 콘텐츠 스타일.
const CONTENT_CLASS =
  'text-sm leading-[1.75] text-foreground [&_h1]:my-2 [&_h1]:text-lg [&_h1]:font-bold ' +
  '[&_h2]:my-2 [&_h2]:text-base [&_h2]:font-bold [&_p]:mb-2 [&_ul]:list-disc [&_ol]:list-decimal ' +
  '[&_li]:ml-5 [&_a]:text-primary [&_a]:underline [&_strong]:font-bold [&_em]:italic ' +
  '[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3';

export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
    editorProps: {
      attributes: {
        class: cn(
          'min-h-[140px] max-h-[320px] overflow-y-auto bg-white p-3.5 outline-none',
          CONTENT_CLASS
        ),
      },
    },
  });

  // 외부 value가 바뀌면(편집 대상 교체 등) 에디터 내용을 동기화.
  // 빈 문서를 onChange와 동일하게 정규화('')해 비교 — 그래야 빈 메모에서 수렴하고
  // 매 렌더 재설정/커서 점프를 막는다.
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? '' : editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  return (
    <div className="overflow-hidden rounded-lg border border-border focus-within:border-primary">
      {editor && (
        <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 px-2.5 py-1.5">
          <ToolBtn
            editor={editor}
            active="bold"
            onClick={(c) => c.toggleBold()}
            className="font-extrabold"
          >
            B
          </ToolBtn>
          <ToolBtn
            editor={editor}
            active="italic"
            onClick={(c) => c.toggleItalic()}
            className="italic"
          >
            I
          </ToolBtn>
          <ToolBtn
            editor={editor}
            active="underline"
            onClick={(c) => c.toggleUnderline()}
            className="underline"
          >
            U
          </ToolBtn>
          <ToolBtn
            editor={editor}
            active="strike"
            onClick={(c) => c.toggleStrike()}
            className="line-through"
          >
            S
          </ToolBtn>
          <Divider />
          <ToolBtn
            editor={editor}
            active="bulletList"
            onClick={(c) => c.toggleBulletList()}
            className="text-[15px]"
          >
            •
          </ToolBtn>
          <ToolBtn
            editor={editor}
            active="orderedList"
            onClick={(c) => c.toggleOrderedList()}
            className="text-xs"
          >
            1.
          </ToolBtn>
          <Divider />
          <ToolBtn
            editor={editor}
            active={{ name: 'heading', attrs: { level: 2 } }}
            onClick={(c) => c.toggleHeading({ level: 2 })}
            className="w-auto px-1.5 text-[11px] font-extrabold"
          >
            제목
          </ToolBtn>
          <ToolBtn
            editor={editor}
            active="paragraph"
            onClick={(c) => c.setParagraph()}
            className="w-auto px-1.5 text-[11px]"
          >
            본문
          </ToolBtn>
        </div>
      )}
      <EditorContent editor={editor} data-placeholder={placeholder} />
    </div>
  );
}

function ToolBtn({
  editor,
  active,
  onClick,
  children,
  className,
}: {
  editor: NonNullable<ReturnType<typeof useEditor>>;
  active: string | { name: string; attrs: Record<string, unknown> };
  onClick: (chain: ChainedCommands) => ChainedCommands;
  children: React.ReactNode;
  className?: string;
}) {
  const isActive =
    typeof active === 'string'
      ? editor.isActive(active)
      : editor.isActive(active.name, active.attrs);
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick(editor.chain().focus()).run();
      }}
      className={cn(
        'inline-flex h-7 w-[30px] items-center justify-center rounded-[5px] text-[13px] text-foreground/80 hover:bg-muted',
        isActive && 'bg-muted text-primary',
        className
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-[18px] w-px flex-shrink-0 bg-border" />;
}

/* HTML 메모를 읽기 전용으로 안전하게(sanitize) 렌더한다. */
export function RichTextView({
  html,
  className,
}: { html: string | null | undefined; className?: string }) {
  if (!html || !html.trim()) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return (
    <div
      className={cn(CONTENT_CLASS, className)}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: DOMPurify로 sanitize한 메모 HTML 렌더 (ADR-0007)
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
    />
  );
}
