.PHONY: help dev dev-web dev-engine build push migrate seed lint test deploy logs ps down clean migrate-from-kavita migrate-from-abs

SHELL := /bin/bash
COMPOSE := docker compose -f deploy/docker-compose.yml --env-file .env

help: ## show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-22s\033[0m %s\n", $$1, $$2}'

dev: ## boot full stack via compose (web + engine + postgres)
	$(COMPOSE) -f deploy/docker-compose.dev.yml up --build

dev-web: ## next.js dev server only (port 3035)
	cd pages-web && pnpm dev

dev-engine: ## FastAPI dev server only (port 8003)
	cd pages-engine && uvicorn app.main:app --reload --host 0.0.0.0 --port 8003

build: ## build all images locally
	$(COMPOSE) build

migrate: ## run drizzle migrations
	cd pages-web && pnpm drizzle:migrate

migrate-from-kavita: ## import library + reading progress from Kavita
	cd pages-engine && python -m app.migrations.kavita_importer

migrate-from-abs: ## import audiobook library + listening positions from Audiobookshelf
	cd pages-engine && python -m app.migrations.abs_importer

scan: ## trigger a full library rescan via the engine API
	curl -X POST http://localhost:8003/scan/full

lint: ## lint web + engine
	cd pages-web && pnpm lint
	cd pages-engine && ruff check app

test: ## run tests (web + engine)
	cd pages-web && pnpm test
	cd pages-engine && pytest -q

deploy: ## push to main → GH Actions → GHCR → Watchtower
	git push origin main

ps: ## list running containers
	$(COMPOSE) ps

logs: ## tail compose logs
	$(COMPOSE) logs -f --tail 200

down: ## stop the stack
	$(COMPOSE) down

clean: ## stop + remove volumes (careful — wipes the pages db)
	$(COMPOSE) down -v
