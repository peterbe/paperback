.PHONY: build deploy release

help:
	@echo "The list of commands:\n"
	@echo "  build        Build the static files"
	@echo "  deploy       Send build to Firebase"
	@echo "  release      All of the above\n"

build:
	# REACT_APP_SERVER_PREFIX="https://us-central1-paperbackwatcher.cloudfunctions.net" yarn run build
	REACT_APP_ROLLBAR_PUBLIC_ACCESS_TOKEN="250c65c27b37412ab488c382be571fad" yarn run build

deploy:
	firebase deploy

release: build deploy
