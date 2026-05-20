.PHONY: dev stop install test lint check

dev: install
	docker compose up -d
	pnpm --parallel dev

stop:
	docker compose down

install:
	pnpm install

test:
	pnpm test

lint:
	pnpm lint

# Same gate CI runs. Run this before `git push` or rely on the pre-push hook.
check:
	pnpm format
	pnpm lint
	pnpm typecheck
	pnpm test
