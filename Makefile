.PHONY: dev build lint preview install test

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

test:
	npm test
