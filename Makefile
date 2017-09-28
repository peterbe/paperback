.PHONY: build deploy release

help:
	@echo "The list of commands:\n"
	@echo "  build        Build the static files"
	@echo "  deploy       Send build to Firebase"
	@echo "  release      All of the above\n"

build:
	yarn run build

deploy:
	firebase deploy

release: build deploy
