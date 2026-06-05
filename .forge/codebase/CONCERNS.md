---
last_mapped_commit: 5c5103df2b3695a9b8bd62b9c5701f2988b8e0ab
mapped: 2026-06-05
---

# Code Concerns & Tech Debt

## Frontend (Web)

### 1. Mock Auth API Not Wired to Real Backend

**Files:** `web/src/features/auth/lib/mock-auth-api.ts`, `web/src/features/auth/hooks/use-auth-mutation.ts`

The frontend auth system is entirely disconnected from the real API. The login/signup flows call `mockLogin()` and `mockSignup()` instead of the FastAPI `/auth/login` and `/auth/signup` endpoints. This creates a complete disconnect:

- User credentials are never validated against the API
- No JWT tokens are returned or stored
- The auth store (`web/src/features/auth/store/auth.store.ts`) stores only the user object, not `access_token` or `refresh_token`
- No logout mechanism exists (no token blacklisting)
- Chat domain endpoints requiring `chat:write` permission will fail because no real auth context exists

**Why it matters:** The app will not function end-to-end with real authentication. The entire auth flow must be reimplemented to call the actual API endpoints and handle JWT token lifecycle (storage, refresh, expiration).

---

### 2. No JWT Token Storage or Management on Client

**Files:** `web/src/features/auth/store/auth.store.ts`, `web/src/features/auth/types/auth.ts`, `web/src/features/auth/hooks/use-auth-mutation.ts`

The frontend auth store maintains only user metadata (name, email) but has **no mechanism to store or manage JWT tokens**:

- `TokenResponse` schema (from API) includes `access_token` and `refresh_token`, but the web client ignores them
- No place in Zustand store for token persistence
- No HTTP client configured to include `Authorization: Bearer <token>` header
- Token refresh flow is not implemented

**Why it matters:** Without token storage and automatic header injection, all protected endpoints will return 401 Unauthorized. The chat endpoints (`POST /chat/complete`, `POST /chat/stream`, etc.) require valid access tokens.

---

### 3. No Real API HTTP Client

**Files:** `web/src/features/auth/lib/mock-auth-api.ts`

The mock API module has hardcoded delays and fake logic. There is no production HTTP client that:

- Calls the real FastAPI backend at `http://localhost:8000/api/v1`
- Includes Authorization header with JWT token
- Handles 401 responses (token expired → refresh → retry)
- Manages error responses with proper status codes

**Why it matters:** All API integration is missing. Any attempt to call real endpoints will fail.

---

## Backend (API)

### 4. RBAC Schema Exists but Logic Is Incomplete

**Files:** `api/alembic/versions/0001_initial_schema.py`, `api/src/domains/auth/models/auth_models.py`, `api/src/domains/auth/security.py`

The database schema includes full RBAC tables (`roles`, `permissions`, `role_permissions`, `user_roles`) and the `User` model has a `has_permission()` method. However:

- **No factory/seed for initial roles & permissions**: The migration creates the tables but no default roles (admin, user, etc.) or permissions (chat:write, etc.) are inserted
- **No endpoints to assign roles to users**: Users are always created without roles, so they will always fail RBAC checks
- **Only chat:write is used**: The auth router endpoints do not require any permissions; only chat routes check `require_permission("chat:write")`
- **Roles table is effectively dead code**: No API to manage roles/permissions; the schema exists but is unmaintainable in production

**Why it matters:** RBAC cannot be activated without a role-assignment strategy. Current chat endpoints will deny all non-admin access (or fail if no role exists). The system is schema-ready but operationally incomplete.

---

### 5. Python 3.14 Incompatibility with LangChain

**Files:** `api/pyproject.toml`

The project specifies `requires-python = ">=3.12"` but langchain's use of deprecated `pydantic.v1` breaks under Python 3.14. This is documented in `CLAUDE.md`:

> Python 3.14 + langchain's `pydantic.v1`はbishocompatなので chat domain test is collection stage で失敗する

**Why it matters:** Any attempt to run tests or use the chat domain on Python 3.14+ will fail at test collection. The constraint `>=3.12` means tests may pass locally but fail in CI if Python version is not pinned to 3.12.x.

---

### 6. Single Alembic Migration Only

**Files:** `api/alembic/versions/0001_initial_schema.py`

Only one migration exists (`0001_initial_schema`). This is problematic because:

- Schema changes during development require manual `task revision` creation
- No baseline exists for future incremental migrations
- Any alteration to `0001_initial_schema` directly violates Alembic best practice
- RBAC tables exist but lack initial data; no follow-up migration to seed roles

**Why it matters:** The schema is frozen at initial state. No migrations for adding indexes, constraints, or test data. Any schema evolution must start from scratch.

---

### 7. No Default Role/Permission Data Seeding

**Files:** `api/src/domains/auth/models/auth_models.py`, `api/alembic/versions/0001_initial_schema.py`

The database schema has `roles`, `permissions`, and `role_permissions` tables, but:

- No default roles (`admin`, `user`, `moderator`) are created
- No permissions (`chat:write`, `chat:read`, etc.) are seeded
- Users created via `/auth/signup` have an empty `roles` list
- Chat endpoints that call `require_permission("chat:write")` will always return 403 Forbidden

**Why it matters:** The RBAC system is inert without initial role/permission rows. Production deployments would need a migration or manual script to populate these tables, creating operational complexity.

---

### 8. OAuth Credential Storage Lacks Validation

**Files:** `api/src/domains/auth/models/auth_models.py`, `api/src/domains/auth/oauth/google.py`, `api/src/domains/auth/oauth/kakao.py`, `api/src/domains/auth/oauth/naver.py`

The `OAuthAccount` model stores raw `access_token` and `refresh_token` in the `Text` column:

```python
access_token: Mapped[str | None] = mapped_column(Text, nullable=True)
refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
```

Issues:

- Tokens are stored in plaintext (no encryption)
- No validation that token values are not empty strings or malformed
- `expires_at` can be `None`, making token rotation unpredictable
- No refresh-token expiry enforcement on read

**Why it matters:** OAuth tokens are sensitive credentials. Plaintext storage is a security risk. Expired tokens could be used if `expires_at` is not checked on every OAuth operation.

---

### 9. Email Verification and Password Reset Tokens Stored as Hash Only

**Files:** `api/src/domains/auth/models/auth_models.py`

The `EmailVerification` and `PasswordReset` models store only a token hash, not the raw token:

```python
token_hash: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
```

This is correct for security, but:

- No `created_at` timestamp to enforce TTL at the application layer (only `expires_at` exists)
- No indexing on `expires_at` for efficient cleanup of stale records
- The `used` flag is set but no `used_at` timestamp is recorded
- No batch-delete mechanism for expired-and-unused tokens

**Why it matters:** Orphaned verification/reset tokens accumulate in the database. Without periodic cleanup, these tables will grow unbounded in production.

---

### 10. Missing Error Handling in Chat Streaming Handler

**Files:** `api/src/domains/chat/router/chat_router.py` (lines 506–544)

The SSE streaming generator (`_event_gen()`) has error handling, but the error event is sent only **after** the stream has already started:

```python
async def _event_gen() -> Any:
    try:
        async for chunk in service.stream(lc_messages):
            collected_chunks.append(chunk)
            yield {"data": chunk}
    except Exception as exc:
        logger.error("chat_stream_error", error=str(exc), exc_info=True)
        yield {"event": "error", "data": str(exc)}  # ← Sent mid-stream
```

Issues:

- If an exception occurs after the first chunk is yielded, the client has already received a 200 OK with partial data
- The HTTP status code cannot be changed mid-stream; error event is sent as SSE data, not HTTP status
- Client-side code must parse the event stream to detect errors (no standard HTTP error handling)
- If an exception occurs **before** the first chunk, the error event is sent correctly, but the semantics are mixed

**Why it matters:** Clients cannot reliably detect LLM provider failures mid-stream. Error recovery is ambiguous.

---

### 11. Auto-Title Generation Silently Fails

**Files:** `api/src/domains/chat/router/chat_router.py` (lines 552–581)

The `_auto_title()` function catches all exceptions and logs them at `WARNING` level but does not propagate the error:

```python
async def _auto_title(...) -> None:
    try:
        title_result = await service.complete(title_messages)
        ...
    except Exception as exc:
        logger.warning("auto_title_failed", conv_id=str(conv_id), error=str(exc))
        # silently swallowed
```

Issues:

- If title generation fails due to LLM provider issues, the user is never notified
- The conversation is left without a title
- Repeated failures accumulate in logs with no alerting mechanism
- No retry logic or circuit breaker

**Why it matters:** Silent failures reduce visibility. Conversations will accumulate without titles if the LLM provider is degraded.

---

### 12. Database Session Commit Race Condition in Chat Streaming

**Files:** `api/src/domains/chat/router/chat_router.py` (lines 522–536)

In the streaming handler, the assistant message is persisted **inside the finally block** after the stream completes:

```python
finally:
    if collected_chunks:
        assistant_content = "".join(collected_chunks)
        try:
            await repo.add_message(...)
            await session.commit()
            if is_first_turn and conv.title is None:
                await _auto_title(...)  # Logs warning but does not fail
        except Exception as db_exc:
            logger.error("chat_message_persist_failed", ...)
```

Issues:

- If `session.commit()` fails, the user has already received all streaming data (200 OK)
- The error is logged but not returned to the client
- The message is not persisted; the next request will show stale history
- Auto-title is called even if the message persistence failed

**Why it matters:** Data loss is possible if the database becomes unavailable after streaming completes. The client is left in an inconsistent state.

---

### 13. Rate Limiting Not Enforced on Chat Endpoints

**Files:** `api/src/main.py` (lines 102–103), `api/src/domains/chat/router/chat_router.py`

The app registers a `Limiter` instance but chat endpoints do not apply rate limits:

```python
# main.py
limiter = Limiter(key_func=_get_user_key)
```

Chat router has no `@limiter.limit()` decorators on `/complete` or `/stream` endpoints.

Issues:

- Users can send unlimited requests, causing unbounded LLM API calls
- No per-user or per-conversation rate limiting
- No throttling for expensive operations (token streaming)
- Cost control is absent

**Why it matters:** Uncontrolled LLM API usage can result in unexpectedly high costs. A single user can exhaust the LLM provider quota.

---

### 14. Hardcoded LLM Temperature in Chat Configuration

**Files:** `api/src/infra/llm/provider_factory.py` (line 60), `api/src/core/config.py` (lines 105–109)

The provider factory and config include temperature as a tunable parameter, but:

- The global default is `0.7` (moderate creativity)
- No per-user or per-conversation override mechanism in the API
- Chat endpoints do not accept `temperature` or `max_tokens` as query/request parameters
- The `/complete` and `/stream` endpoints have no way to request deterministic (0.0) vs. creative (2.0) responses

**Why it matters:** Users cannot adjust LLM behavior for their use case (e.g., deterministic for facts, creative for ideation). The API is inflexible.

---

### 15. Missing Pagination on Conversation/Message Listing

**Files:** `api/src/domains/chat/router/chat_router.py` (lines 406–422)

The `GET /chat/conversations/{conversation_id}/messages` endpoint returns all messages in a conversation:

```python
async def list_messages(...) -> list[MessageResponse]:
    repo = ChatRepository(session)
    msgs = await repo.get_conversation_messages(conversation_id)
    return [MessageResponse.model_validate(m) for m in msgs]
```

Issues:

- No `limit` / `offset` parameters
- Large conversations (1000+ messages) will fetch all rows and serialize to JSON
- Client receives gigabytes of data if a conversation is very long
- No sorting options (newest first vs. oldest first)

**Why it matters:** Performance degrades with long conversations. N+1 queries are likely if the repository does not use `selectinload` for related data.

---

### 16. No Request Validation on Chat Request Message Count

**Files:** `api/src/domains/chat/router/chat_router.py` (lines 102–115)

The `ChatRequest` schema allows empty or very large message lists:

```python
class ChatRequest(BaseModel):
    messages: list[ChatMessage]  # No min/max length constraint
    system: str | None = None
```

Issues:

- Clients can send 0 messages → service.complete() receives empty list
- Clients can send 10,000+ messages → context-length errors from LLM
- No validation of individual message content length (could be gigabytes)
- No schema validation that at least one message is present

**Why it matters:** Invalid inputs cause LLM errors or OOM conditions. The API should reject invalid payloads upfront.

---

### 17. CORS Configured to Allow All Methods and Headers

**Files:** `api/src/main.py` (lines 130–137)

The CORS middleware is overly permissive:

```python
application.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],  # ← Allow all HTTP methods
    allow_headers=["*"],  # ← Allow all headers
    expose_headers=["X-Correlation-ID"],
)
```

Issues:

- `allow_methods=["*"]` allows `DELETE`, `PATCH`, etc., even if no endpoint defines them
- `allow_headers=["*"]` allows any header, including potentially spoofed auth headers
- This is overly permissive for production

**Why it matters:** Overly permissive CORS is a security anti-pattern. Explicit allowlisting is safer.

---

### 18. No Validation on OAuth Redirect URI

**Files:** `api/src/core/config.py` (lines 333–343)

OAuth redirect URIs are stored as plain strings without validation:

```python
google_redirect_uri: str = ""
kakao_redirect_uri: str = ""
naver_redirect_uri: str = ""
```

Issues:

- No URL validation (could be malformed)
- No enforcement that URIs match the registered values at the provider
- No check for HTTPS in production (only dev uses http://localhost)
- Typos in `.env` are not caught until OAuth flow fails

**Why it matters:** OAuth is sensitive to redirect URI mismatches. Typos cause authentication failures or security vulnerabilities (open redirect).

---

### 19. No Automatic Token Cleanup on Logout

**Files:** `api/src/domains/auth/router/auth_router.py`, `api/src/domains/auth/service/auth_service.py`

The logout endpoint (`POST /auth/logout`) blacklists the JWT but does not delete the corresponding `RefreshToken` row from the database:

Issues:

- `RefreshToken` rows accumulate (one per issued token)
- Old tokens are marked `revoked=True` but never deleted
- The database will grow unbounded with stale rows
- No batch-cleanup mechanism for expired tokens

**Why it matters:** Database bloat; refresh_tokens table will contain millions of rows in production.

---

### 20. Password Reset Token TTL Hardcoded to 1 Hour

**Files:** `api/src/domains/auth/service/auth_service.py` (line 56)

```python
PASSWORD_RESET_EXPIRE_HOURS: int = 1
```

Issues:

- 1 hour is inflexible; users on slow email systems may miss the window
- No configuration option to extend TTL
- The value is hardcoded in source, not in `.env`

**Why it matters:** Users get locked out if they don't verify within the hardcoded window. Configuration should be externalized.

---

### 21. No Database Connection Pool Exhaustion Handling

**Files:** `api/src/core/database.py` (lines 71–85)

The async engine is configured with `pool_size=5, max_overflow=10` for typical web workloads:

```python
return create_async_engine(
    settings.async_database_url,
    ...
    pool_size=5,
    max_overflow=10,
    ...
)
```

Issues:

- No monitoring of pool exhaustion
- No fallback if all connections are busy
- SSE streaming endpoints hold a connection for the duration of the stream (could exhaust pool)
- Long-running chat streams may starve other requests

**Why it matters:** Streaming endpoints can deadlock the connection pool if many concurrent streams exist.

---

### 22. Missing Structured Error Response Format

**Files:** `api/src/core/exceptions.py`, `api/src/domains/auth/router/auth_router.py`, `api/src/domains/chat/router/chat_router.py`

The API returns `{"detail": "..."}` for all errors, without a consistent error code or category:

Issues:

- No `code` field (e.g., `"ERR_USER_NOT_FOUND"`)
- No `error_type` field to classify the error (validation, auth, rate_limit, etc.)
- Clients cannot programmatically distinguish between 400 (validation) and 409 (conflict)
- Error messages are human-readable strings, not machine-parseable

**Why it matters:** API clients must parse error messages as strings, which is fragile. A structured error format enables better error handling.

---

### 23. No Request/Response Size Limits

**Files:** `api/src/main.py`

FastAPI defaults are used for request/response size limits:

Issues:

- No limit on request body size → clients can POST gigabytes
- No limit on response size → large paginated responses are not throttled
- Chat requests with very long system prompts or message history can exceed LLM context windows
- No bandwidth protection

**Why it matters:** DoS attacks can send enormous payloads. The API should reject oversized requests.

---

## Architecture & Design

### 24. No Integration Tests for Auth + Chat Flow

**Files:** `api/tests/`

The test suite includes unit tests for individual services, but no end-to-end integration tests that:

- Register a user → verify email → login → receive JWT → call chat endpoint
- Verify that chat endpoints enforce `chat:write` permission
- Test that token refresh works and invalidates old tokens
- Verify OAuth callback flow

**Why it matters:** The interaction between auth and chat domains is not tested. Integration bugs only surface in manual testing.

---

### 25. LLM Provider Failure Has No Fallback

**Files:** `api/src/domains/chat/service/chat_service.py`, `api/src/domains/chat/router/chat_router.py`

If the LLM provider is unavailable, the request fails immediately:

Issues:

- No fallback provider (e.g., Ollama if OpenAI is down)
- No retry logic with exponential backoff (Tenacity is in dependencies but not used)
- No circuit breaker to fail fast if provider is known to be down
- Streaming responses fail mid-stream with no recovery

**Why it matters:** Service reliability is poor. Even temporary LLM provider outages cause user-facing failures.

---

### 26. No Audit Logging for Security Events

**Files:** `api/src/domains/auth/`

Security events (login success, login failure, token refresh, logout, role assignment) are not logged in a tamper-proof audit trail:

Issues:

- Login failures are not counted (no brute-force protection)
- Successful logins are not tracked (no anomaly detection)
- RBAC denials log at `WARNING` but are not sent to an audit stream
- No retention policy for audit logs

**Why it matters:** Compliance and forensics are impossible without audit trails. Security incidents cannot be investigated.

---

## Configuration & Deployment

### 27. Default Secrets in .env.example

**Files:** `api/.env.example`

Placeholders for critical secrets are documented but generic:

```
SECRET_KEY=change-me-in-production-use-openssl-rand-hex-32
JWT_SECRET_KEY=change-me-jwt-secret-key-use-openssl-rand-hex-32
```

Issues:

- Example values may accidentally be used in production
- No validation that secrets have been changed
- No minimum entropy check
- JWT_SECRET_KEY should differ from SECRET_KEY, but this is not enforced

**Why it matters:** If default secrets are used in production, the system is immediately compromised.

---

### 28. No Health Check for LLM Provider Connectivity

**Files:** `api/src/main.py` (lines 167–221)

The `/ready` endpoint checks PostgreSQL, Redis, and Mailpit SMTP, but **not** LLM provider connectivity:

Issues:

- If OpenAI API is unreachable, the service reports "ready" but chat endpoints will fail
- Load balancers cannot detect LLM provider outages
- No way to gracefully drain chat traffic before a provider failure

**Why it matters:** The service is advertised as ready even when a critical dependency (LLM provider) is offline.

---

### 29. No Observability for Token Lifecycle

**Files:** `api/src/domains/auth/security.py`

JWT blacklist operations log at `DEBUG` level, but token lifecycle events should be observable:

Issues:

- No structured logging for token generation vs. validation
- No metrics for token refresh rate or blacklist hits
- Token expiry times are not logged
- No way to detect token leaks or unusual refresh patterns

**Why it matters:** Suspicious auth activity cannot be detected in production. A leaked token can be used indefinitely until expiry.

---

## Summary of Critical Issues

| Issue | Severity | Component | Impact |
|-------|----------|-----------|--------|
| Mock Auth API | **Critical** | Web | App cannot authenticate; entire system is non-functional |
| No JWT Token Storage | **Critical** | Web | Protected endpoints will always return 401 |
| RBAC Incomplete | **High** | API | Chat endpoints are unreachable (all users denied) |
| Python 3.14 Incompatibility | **High** | API | Tests fail on Python 3.14+ |
| Stream Error Handling | **High** | API | Data loss possible if DB fails mid-stream |
| Rate Limiting Missing | **High** | API | Unbounded LLM API costs |
| No Pagination | **Medium** | API | Large conversations cause memory exhaustion |
| OAuth Token Plaintext | **Medium** | API | Sensitive credentials stored insecurely |
| Token Cleanup | **Medium** | API | Database bloat over time |
| Default Secrets | **Medium** | Config | Production compromise risk if not changed |

