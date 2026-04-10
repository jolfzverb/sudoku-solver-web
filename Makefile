.PHONY: dev build lint preview install

install:
	npm install

dev:
	npx vite

build:
	npx tsc -b && npx vite build

lint:
	npx eslint .

preview:
	npx vite preview
