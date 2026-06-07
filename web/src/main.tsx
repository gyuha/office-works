import '@fontsource-variable/inter';
import '@/styles/globals.css';
import '@/sample/i18n';

import { setupApiClient } from '@/lib/api-client';
import { router } from '@/lib/router';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// 생성 API 클라이언트 인터셉터(Bearer 부착 + 401 처리) 등록
setupApiClient();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
