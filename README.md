# `sipfront/action-call-test` GitHub Workflow Action

Sipfront is a test automation platform for telecom tests.
It is hosted at [https://app.sipfront.com](https://app.sipfront.com),
and you can find more information on our [homepage](https://sipfront.com).

This action executes an end-to-end call test, which you pre-define on the
[Sipfront SaaS platform](https://app.sipfront.com), to allow you to
fully integrate your tests into your GitHub CI/CD pipeline.

## Howto

1. Sign up for an account at [https://app.sipfront.com](https://app.sipfront.com)
1. Generate an API key on the
   [API section](https://app.sipfront.com/subscription/apikey) of the
   web interface
1. Add the public and secret API key as `SIPFRONT_PUBLIC_KEY` and
   `SIPFRONT_SECRET_KEY` to your GitHub repository secrets
   ([instructions](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions#creating-secrets-for-a-repository))
1. Create a test on the [Sipfront web interface](https://app.sipfront.com/)
1. Add your workflow by using and adapting the following example:

```yaml
name: Run Sipfront Call Test

on: [ pull_request ]

jobs:
  sipfront-call-test:
    name: Test end-to-end call on Sipfront
    runs-on: ubuntu-latest
    steps:

      # Your pre-requisites steps go here to checkout, build and deploy
      # your changes to your test system, such as:
      - name: Checkout
        id: checkout
        uses: actions/checkout@v3

      # Then, trigger the test run:
      - name: Run end-to-end Sipfront call test
        id: testcall
        uses: sipfront/action-call-test@v0.0.6
        with:
          public_key: '${{ secrets.SIPFRONT_PUBLIC_KEY }}'
          secret_key: '${{ secrets.SIPFRONT_SECRET_KEY }}'
          name: 'basic-call-a-b'

      # You can also print the test session id used in the call test
      - name: Print Output
        id: output
        run: echo "${{ steps.testcall.outputs.session_id }}"
```

## Inputs

### `public_key`

**Required** Your Sipfront API public key, get it from the
[Sipfront App](https://app.sipfront.com/subscription/apikey).

### `secret_key`

**Required** Your Sipfront API secret key, get it from the
[Sipfront App](https://app.sipfront.com/subscription/apikey).

### `name`

**Required** Your Sipfront test name to trigger.

### `destination`

**Optional** The destination to call, overriding the test configuration.

## Outputs

### `session_id`

The Sipfront test session ID of the executed test run.

## Example usage

```yaml
uses: sipfront/action-call-test@v0.0.6
with:
  public_key: '${{ secrets.SIPFRONT_PUBLIC_KEY }}'
  secret_key: '${{ secrets.SIPFRONT_SECRET_KEY }}'
  name: 'basic-call-a-b'
```
