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
        uses: sipfront/action-call-test@v0.0.7
        with:
          public_key: '${{ secrets.SIPFRONT_PUBLIC_KEY }}'
          secret_key: '${{ secrets.SIPFRONT_SECRET_KEY }}'
          name: 'basic-call-a-b'

      # You can also print the test session id and report URL of the run
      - name: Print Output
        id: output
        run: |
          echo "Session: ${{ steps.testcall.outputs.session_id }}"
          echo "Status:  ${{ steps.testcall.outputs.status }}"
          echo "Report:  ${{ steps.testcall.outputs.report_url }}"
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

### `report_mode`

**Optional** Report rendering mode, one of `full`, `kiosk` or `print`.

### `poll_interval`

**Optional** Seconds to wait between test status polls. Defaults to `3`.

### `timeout`

**Optional** Maximum seconds to wait for the test to finish before the action
fails. Set to `0` to disable. Defaults to `1800` (30 minutes).

## Outputs

All outputs are populated once the run finishes, including for failed runs, so
you can always link to the report.

### `session_id`

The Sipfront test session ID of the executed test run.

### `status`

The final session status: `passed`, `failed` or `running`.

### `result_description`

A human-readable description of the test result.

### `report_url`

The URL of the test session report on the Sipfront App.

### `test_id` / `test_name`

The id and name of the executed test.

### `project_id` / `project_name`

The id and name of the project the test belongs to.

### `testcase_name`

The name of the test case (scenario) that was executed.

### `agentpool_name`

The name of the agent pool that ran the test.

### `started_at` / `stopped_at`

Timestamps (UTC) when the test session started and stopped.

### `tags`

JSON-encoded tags associated with the test session.

## Example usage

```yaml
uses: sipfront/action-call-test@v0.0.7
with:
  public_key: '${{ secrets.SIPFRONT_PUBLIC_KEY }}'
  secret_key: '${{ secrets.SIPFRONT_SECRET_KEY }}'
  name: 'basic-call-a-b'
```
