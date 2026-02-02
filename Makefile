build-OgCrawlerFunction:
	cp -r . $(ARTIFACTS_DIR)/
	cd $(ARTIFACTS_DIR) && npm install --production --omit=dev
