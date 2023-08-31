# go-notice-slack-sample

## Description

Repository for sample notifications from Slack in Go language.

## Dev Settings

### Set environment variables

1. Export environment variables
    ```
    $ touch .envrc
    $ echo "export CDK_DEFAULT_ACCOUNT=<YOUR AWS ACCOUNT FOR DEPLOY APPS>" >> .envrc
    $ echo "export CDK_DEFAULT_REGION=<YOUR AWS REGION FOR DEPLOY APPS>" >> .envrc
    $ echo "export AWS_VAULT_BACKEND=pass" >> .envrc
    $ echo "export AWS_VAULT_PASS_PREFIX=aws-vault" >> .envrc
    $ echo "export AWS_SESSION_TOKEN_TTL=1h" >> .envrc
    $ echo "export AWS_DEFAULT_REGION=<YOUR AWS DEFAULT REGION>" >> .envrc
    $ direnv allow
    ```

### Install dependencies

    ```
    $ make dev-deps deploy-deps
    ```

### AWS credentials

1. Generate GPG key
    ```
    $ gpg --gen-key
    ```
1. Initialize password-store
    ```
    $ pass init <TYPED EMAIL IN GPG GENERATION>
    ```
1. Register your aws profile
    ```
    $ aws-vault add <PROFILE NAME>
    Enter Access Key ID: <YOUR AWS ACCESS KEY>
    Enter Secret Access Key: <YOUR AWS SECRET ACCESS KEY>
    ```
1. Check for successful completion
    ```
    $ aws-vault exec stage -- aws s3 ls
    ```

## Deploy and destroy applications

### Deploy applications with CDK in AWS

1. Build applications
    ```
    $ make build
    ```
1. Archive bin files for Lambda
    ```
    $ make archive
    ```
1. Deploy applications
    ```
    $ aws-vault exec stage -- make deploy
    ```

### Destroy applications with CDK in AWS

```
$ aws-vault exec stage -- make destroy
```

## Invoke AWS Lambda applications

```
$ aws-vault exec <PROFILE NAME> -- aws lambda invoke \
  --invocation-type Event \
  --function-name go-notice-slack-sample-message-post \
  --payload $(echo '{ "message": "hello world" }' | base64) \
  response.json
```
