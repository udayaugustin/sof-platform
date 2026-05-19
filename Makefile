.PHONY: dev stop install test lint

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
