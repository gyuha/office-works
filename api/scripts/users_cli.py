"""Local users directory CLI — Excel (.xlsx) bulk import + blank template.

Two argparse subcommands::

    # write a blank template (헤더만 있는 .xlsx) — no DB needed
    PYTHONPATH=src uv run python scripts/users_cli.py template [출력경로]

    # bulk-import users from a filled .xlsx into the DB (DB 가동·마이그레이션 선행)
    PYTHONPATH=src uv run python scripts/users_cli.py import <파일.xlsx>

Reuses the pure helpers in ``domains.users.service.user_import`` and the
``UserDirectoryService.create`` business logic. Like ``scripts/seed.py`` and
``scripts/create_dev_admin.py`` it talks to the DB directly with no auth.

Import commits per successful row and rolls back per failed row: a flush
``IntegrityError`` (duplicate employee_no) poisons the SQLAlchemy transaction,
so a single end-of-loop commit would cascade every later row to failure.

Exit codes: 전부 성공 → 0, 실패행 존재 → 1, 파일 읽기 실패(.xlsx 아님·헤더
불일치·빈 파일) → 2.
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from core.config import get_settings
from core.exceptions import AppError
from domains.users.repository import UserDirectoryRepository
from domains.users.service import UserDirectoryService
from domains.users.service.user_import import build_import_template, parse_import_rows

DEFAULT_TEMPLATE_NAME = "users_template.xlsx"


def resolve_template_path(arg: str | None) -> Path:
    """Resolve the template output path.

    None → ``./users_template.xlsx`` in cwd; an existing directory →
    ``<dir>/users_template.xlsx``; a path ending in ``.xlsx`` → that exact path.
    """
    if arg is None:
        return Path.cwd() / DEFAULT_TEMPLATE_NAME
    path = Path(arg)
    if path.is_dir():
        return path / DEFAULT_TEMPLATE_NAME
    if path.suffix == ".xlsx":
        return path
    return path / DEFAULT_TEMPLATE_NAME


def decide_exit_code(created: int, failed_count: int, parse_failed: bool) -> int:
    """전부 성공 → 0, 실패행 존재 → 1, 파일 읽기 실패 → 2."""
    if parse_failed:
        return 2
    if failed_count > 0:
        return 1
    return 0


def run_template(arg: str | None) -> int:
    """Write the blank import template to the resolved path. Returns exit code 0."""
    path = resolve_template_path(arg)
    existed = path.exists()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(build_import_template())
    if existed:
        print(f"기존 파일을 덮어썼습니다: {path}")
    else:
        print(f"템플릿을 생성했습니다: {path}")
    return 0


async def run_import(xlsx_path: str) -> int:
    """Import users from *xlsx_path*, committing per successful row. Returns exit code."""
    try:
        file_bytes = Path(xlsx_path).read_bytes()
    except OSError as exc:
        print(f"파일을 읽을 수 없습니다: {xlsx_path} — {exc}")
        return decide_exit_code(0, 0, parse_failed=True)

    try:
        valid_rows, parse_errors = parse_import_rows(file_bytes)
    except ValueError as exc:
        print(str(exc))
        return decide_exit_code(0, 0, parse_failed=True)

    failures: list[tuple[int, str]] = [(err.row, err.reason) for err in parse_errors]
    created = 0

    engine = create_async_engine(get_settings().database_url)
    sessionmaker = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with sessionmaker() as session:
            service = UserDirectoryService(UserDirectoryRepository(session))
            for excel_row, user in valid_rows:
                try:
                    await service.create(user)
                    await session.commit()
                    created += 1
                except AppError as exc:
                    await session.rollback()
                    failures.append((excel_row, f"{user.email} — {exc.message}"))
    finally:
        await engine.dispose()

    print(f"생성 {created}건")
    for row, reason in sorted(failures, key=lambda item: item[0]):
        print(f"{row}행: {reason}")

    return decide_exit_code(created, len(failures), parse_failed=False)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="users_cli", description="사용자 디렉터리 엑셀 임포트 / 템플릿 도구."
    )
    sub = parser.add_subparsers(dest="command", required=True)

    template = sub.add_parser("template", help="빈 임포트 템플릿 .xlsx 저장 (DB 불필요)")
    template.add_argument(
        "output", nargs="?", default=None, help="출력 경로(디렉터리 또는 .xlsx). 생략 시 현재 폴더"
    )

    import_cmd = sub.add_parser("import", help="엑셀에서 사용자 일괄 등록 (DB 선행 필요)")
    import_cmd.add_argument("xlsx_path", help="임포트할 .xlsx 파일 경로")

    return parser


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    if args.command == "template":
        return run_template(args.output)
    return asyncio.run(run_import(args.xlsx_path))


if __name__ == "__main__":
    sys.exit(main())
