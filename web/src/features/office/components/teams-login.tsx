import { useState } from 'react';
import { cn } from '@/lib/utils';

type AuthStatus = 'idle' | 'loading' | 'success';

interface TeamsLoginProps {
  onAuthenticated?: () => void;
}

const FEATURES = [
  '구성원 및 조직 관리',
  '전자결재 · 수신함 · 상신함',
  '프로젝트 투입 및 일정 관리',
  '근태 · 휴가 · 분석 리포트',
];

function BriefcaseLockMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3.5"
        y="8.5"
        width="17"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8.5 8.5V6a3.5 3.5 0 0 1 7 0v2.5M3.5 13.5h17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.5" r="1.4" fill="currentColor" />
    </svg>
  );
}

function TeamsIcon() {
  return (
    <svg
      className="h-[22px] w-[22px] shrink-0"
      viewBox="0 0 2228.833 2073.333"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M1554.637 777.5h575.713c54.391 0 98.483 44.092 98.483 98.483v524.398c0 199.901-162.051 361.952-361.952 361.952h-1.711c-199.901.028-361.975-162.002-361.975-361.903V828.971c0-28.427 23.044-51.471 51.442-51.471z"
        fill="#5059C9"
      />
      <circle cx="1943.75" cy="440.583" r="233.25" fill="#5059C9" />
      <circle cx="1218.083" cy="336.917" r="336.917" fill="#7B83EB" />
      <path
        d="M1667.323 777.5H717.01C663.747 777.5 620.5 820.747 620.5 874.01v988.623c0 233.217 189.029 421.699 422.246 422.247h.787c233.671 0 422.913-188.694 423.46-422.365V828.46c0-28.046-22.743-50.96-199.67-50.96z"
        fill="#7B83EB"
      />
      <path
        opacity=".1"
        d="M1244.833 777.5v1024.798c0 22.753-5.507 44.252-15.226 63.235a126.19 126.19 0 0 1-110.574 65.765H667.975c-7.374-18.219-13.679-36.915-18.695-56.074-5.934-22.101-8.85-44.979-8.85-68.609V874.01c0-53.263 43.247-96.51 96.51-96.51h508.393z"
        fill="#000"
      />
      <path
        opacity=".05"
        d="M1300.907 777.5v1080.872c0 55.795-33.684 106.675-85.503 128.27a126.19 126.19 0 0 1-49.071 9.858H691.876c-9.854-17.766-18.669-36.199-26.369-55.274-7.374-18.219-13.679-36.915-18.695-56.074-5.934-22.101-8.85-44.979-8.85-68.609V874.01c0-53.263 43.247-96.51 96.51-96.51h565.435z"
        fill="#000"
      />
      <path
        opacity=".05"
        d="M1300.907 777.5v968.724c0 55.795-45.173 101.088-100.967 101.088H650.183c-5.934-22.101-8.85-44.979-8.85-68.609V874.01c0-53.263 43.247-96.51 96.51-96.51h563.064z"
        fill="#000"
      />
      <path
        d="M1218.083 777.5H650.183c-53.263 0-96.51 43.247-96.51 96.51v906.903c0 53.263 43.247 96.51 96.51 96.51h567.9c53.263 0 96.51-43.247 96.51-96.51V874.01c0-53.263-43.247-96.51-96.51-96.51z"
        fill="#4B53BC"
      />
      <path
        d="M1024.765 969.517H868.975v439.517h-96.9V969.517H616.283v-82.733h408.482v82.733z"
        fill="#fff"
      />
    </svg>
  );
}

export function TeamsLogin({ onAuthenticated }: TeamsLoginProps) {
  const [status, setStatus] = useState<AuthStatus>('idle');

  const handleLogin = () => {
    if (status !== 'idle') return;
    setStatus('loading');

    // Simulate Teams SSO auth flow.
    window.setTimeout(() => {
      setStatus('success');
      window.setTimeout(() => {
        onAuthenticated?.();
      }, 800);
    }, 1500);
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-om-canvas md:grid-cols-2">
      {/* LEFT: brand panel */}
      <section className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#1B2435] to-[#141C2B] px-10 py-12 md:px-14 md:py-[52px]">
        {/* decorative radial glows */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -top-28 h-[520px] w-[520px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(0,102,255,0.12) 0%, transparent 70%)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 -left-24 h-[380px] w-[380px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(91,94,166,0.18) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-gradient-to-br from-[#2E8BFF] to-primary text-white shadow-[0_6px_18px_rgba(0,102,255,0.45)]">
              <BriefcaseLockMark />
            </div>
            <div>
              <div className="text-2xl font-extrabold tracking-[-0.025em] text-white">
                OfficeMate
              </div>
              <div className="mt-0.5 text-[13px] font-medium text-white/45">
                오피스 관리 시스템
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <h1 className="text-[42px] font-extrabold leading-[1.22] tracking-[-0.03em] text-white">
            팀과 함께하는
            <br />
            <em className="bg-gradient-to-r from-[#4fa3ff] to-[#a78bfa] bg-clip-text not-italic text-transparent">
              스마트한 업무
            </em>
            <br />
            관리 플랫폼
          </h1>
          <p className="mt-5 max-w-[340px] text-base font-medium leading-[1.65] text-white/[0.52]">
            구성원, 프로젝트, 결재, 근무 관리까지 — 조직 운영에 필요한 모든 것을 한
            곳에서 처리하세요.
          </p>
          <div className="mt-9 flex flex-col gap-3">
            {FEATURES.map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <span className="h-2 w-2 shrink-0 rounded-full bg-primary shadow-[0_0_8px_rgba(0,102,255,0.7)]" />
                <span className="text-sm font-semibold text-white/70">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-[12.5px] font-medium text-white/[0.28]">
          © 2026 OfficeMate. All rights reserved.
        </div>
      </section>

      {/* RIGHT: login card */}
      <section className="flex items-center justify-center bg-om-canvas px-6 py-10">
        <div className="w-full max-w-[420px] rounded-2xl border border-border bg-white px-11 py-12 shadow-sm">
          <div className="mb-2.5 text-xs font-extrabold uppercase tracking-[0.08em] text-primary">
            Sign in
          </div>
          <h2 className="text-[28px] font-extrabold leading-[1.25] tracking-[-0.025em] text-foreground">
            환영합니다 👋
          </h2>
          <p className="mt-2.5 text-[15px] font-medium leading-[1.6] text-muted-foreground">
            조직 계정으로 로그인하면
            <br />
            OfficeMate를 바로 이용하실 수 있습니다.
          </p>

          <div className="my-8 h-px bg-border" />

          <button
            type="button"
            onClick={handleLogin}
            disabled={status !== 'idle'}
            className={cn(
              'flex h-13 w-full items-center justify-center gap-3 rounded-xl text-[15px] font-bold tracking-[0.005em] text-white transition-[background-color,box-shadow,transform] duration-150 active:scale-[0.985] disabled:cursor-not-allowed',
              'h-[52px]',
              status === 'success'
                ? 'bg-om-green shadow-[0_4px_14px_rgba(0,191,64,0.35)]'
                : 'bg-[#5B5EA6] shadow-[0_4px_14px_rgba(91,94,166,0.35)] hover:bg-[#4A4D8F] hover:shadow-[0_6px_20px_rgba(91,94,166,0.45)]',
              status === 'loading' && 'opacity-60'
            )}
          >
            {status === 'idle' && (
              <>
                <TeamsIcon />
                <span>Microsoft Teams로 로그인</span>
              </>
            )}
            {status === 'loading' && (
              <span className="h-[18px] w-[18px] animate-spin rounded-full border-[2.5px] border-white/35 border-t-white" />
            )}
            {status === 'success' && (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                  <path
                    d="m8.5 12 2.5 2.5 4.5-5"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>인증 완료 · 이동 중…</span>
              </>
            )}
          </button>

          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-om-canvas px-4 py-3.5">
            <svg
              className="mt-px h-[17px] w-[17px] shrink-0 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12 3 5 6v5c0 4.4 3 8 7 10 4-2 7-5.6 7-10V6l-7-3Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="m9 12 2 2 4-4.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-[13px] font-medium leading-[1.55] text-muted-foreground">
              <strong className="font-bold text-foreground">안전한 Single Sign-On</strong>
              <br />
              Microsoft Azure AD를 통해 인증합니다. OfficeMate는 비밀번호를 저장하지
              않습니다.
            </p>
          </div>

          <div className="mt-8 text-center text-[12.5px] font-medium text-muted-foreground/70">
            로그인 문제가 발생하면{' '}
            <a href="#" className="text-muted-foreground underline">
              IT 관리자에게 문의
            </a>
            하세요.
          </div>
        </div>
      </section>
    </div>
  );
}
