ROOT_PACKAGE:=github.com/mkaiho/go-notice-slack-sample
BIN_DIR:=_deployments/bin
SRC_DIR:=$(shell go list ./cmd/...)
BINARIES:=$(SRC_DIR:$(ROOT_PACKAGE)/%=$(BIN_DIR)/%)
ARCHIVE_DIR:=_deployments/zip
ARCHIVES:=$(SRC_DIR:$(ROOT_PACKAGE)/%=$(ARCHIVE_DIR)/%)


.PHONY: build
build: clean $(BINARIES)

$(BINARIES):
	go build -o $@ $(@:$(BIN_DIR)/%=$(ROOT_PACKAGE)/%)

.PHONY: archive
archive: $(ARCHIVES)

$(ARCHIVES):$(BINARIES)
	@test -d $(ARCHIVE_DIR) || mkdir $(ARCHIVE_DIR)
	@test -d $(ARCHIVE_DIR)/cmd || mkdir $(ARCHIVE_DIR)/cmd
	@cp $(@:$(ARCHIVE_DIR)/%=$(BIN_DIR)/%) $(BIN_DIR)/bootstrap
	@zip -j $@.zip $(BIN_DIR)/bootstrap
	@rm $(BIN_DIR)/bootstrap

.PHONY: reshim
reshim:
	asdf reshim golang

.PHONY: dev-deps
dev-deps:
	go install gotest.tools/gotestsum@v1.7.0
	go install github.com/vektra/mockery/v2@latest
	@make reshim

.PHONY: deps
deps:
	go mod download

.PHONY: gen-mock
gen-mock:
	make dev-deps
	mockery --all --case underscore --recursive --keeptree

.PHONY: test
test:
	# gotestsum ./entity/... ./usecase/... ./adapter/... ./infrastructure/...
	gotestsum ./...

.PHONY: test-report
test-report:
	@rm -rf ./test-results
	@mkdir -p ./test-results
	gotestsum --junitfile ./test-results/unit-tests.xml -- -coverprofile=cover.out ./...

.PHONY: deploy-deps
deploy-deps:
	cd ./_deployments/cdk && npm i

.PHONY: cdk-test
cdk-test:
	cd ./_deployments/cdk && npm test

.PHONY: cdk-update-snapshot
cdk-update-snapshot:
	cd ./_deployments/cdk && npm test -- -u

.PHONY: deploy
deploy: cdk-test
	cd ./_deployments/cdk && npx cdk deploy -c env=stage

.PHONY: destroy
destroy:
	cd ./_deployments/cdk && npx cdk destroy -c env=stage

.PHONY: clean
clean:
	@rm -rf ${BIN_DIR}
	@rm -rf ${ARCHIVE_DIR}