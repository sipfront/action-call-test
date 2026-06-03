# `sipfront/action-call-test` GitHub Workflow Action

Sipfront is a test automation platform for telecom tests.
It is hosted at [https://app.sipfront.com](https://app.sipfront.com),
and you can find more information on our [homepage](https://sipfront.com).

This action executes either a single end-to-end call test or a whole project
run, which you pre-define on the
[Sipfront SaaS platform](https://app.sipfront.com), to allow you to
fully integrate your tests into your GitHub CI/CD pipeline. Use the `mode`
input to choose between running a single `test` (default) or a whole
`project`.

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

To run a whole project instead of a single test, set `mode: project` and pass
a `project_id`:

```yaml
      - name: Run a whole Sipfront project
        id: projectrun
        uses: sipfront/action-call-test@v0.0.7
        with:
          public_key: '${{ secrets.SIPFRONT_PUBLIC_KEY }}'
          secret_key: '${{ secrets.SIPFRONT_SECRET_KEY }}'
          mode: 'project'
          project_id: '42'
          # Optional: only run a subset of the project's tests
          # test_ids: '101,102,103'

      - name: Print project run report
        run: |
          echo "Status: ${{ steps.projectrun.outputs.status }}"
          echo "Report: ${{ steps.projectrun.outputs.report_url }}"
          echo "Tests:  ${{ steps.projectrun.outputs.total_tests }}"
```

## Inputs

### `public_key`

**Required** Your Sipfront API public key, get it from the
[Sipfront App](https://app.sipfront.com/subscription/apikey).

### `secret_key`

**Required** Your Sipfront API secret key, get it from the
[Sipfront App](https://app.sipfront.com/subscription/apikey).

### `mode`

**Optional** What to run: `test` (a single test, the default) or `project`
(a whole project).

### `name`

**Required for `mode=test`** Your Sipfront test name to trigger.

### `destination`

**Optional (`mode=test`)** The destination to call, overriding the test
configuration.

### `project_id`

**Required for `mode=project`** (unless `project_name` is given) The id of the
project to run. Takes precedence over `project_name` if both are set.

### `project_name`

**Optional (`mode=project`)** The name of the project to run, used when
`project_id` is not set. Either `project_id` or `project_name` is required for
`mode=project`.

### `test_ids`

**Optional (`mode=project`)** Comma-separated subset of test ids to run from
the project (e.g. `101,102,103`). If omitted, all tests in the project run.

### `report_mode`

**Optional** Report rendering mode. For `mode=test`: one of `full`, `kiosk` or
`print`. For `mode=project`: `full` or `kiosk`.

### `poll_interval`

**Optional** Seconds to wait between status polls. Defaults to `3`.

### `timeout`

**Optional** Maximum seconds to wait for the run to finish before the action
fails. Set to `0` to disable. Defaults to `1800` (30 minutes).

## Outputs

All outputs are populated once the run finishes, including for failed runs, so
you can always link to the report.

### Common (both modes)

- **`status`** — final status. `mode=test`: `passed`/`failed`/`running`.
  `mode=project`: `passed`/`failed`/`stopped`/`running`.
- **`report_url`** — URL of the test session or project run report.
- **`project_id`** — id of the project the run belongs to.
- **`started_at` / `stopped_at`** — timestamps (UTC) when the run started and
  stopped.

### Single test (`mode=test`)

- **`session_id`** — the Sipfront test session id of the executed test run.
- **`result_description`** — human-readable description of the test result.
- **`test_id` / `test_name`** — id and name of the executed test.
- **`project_name`** — name of the project the test belongs to.
- **`testcase_name`** — name of the test case (scenario) executed.
- **`agentpool_name`** — name of the agent pool that ran the test.
- **`tags`** — JSON-encoded tags associated with the test session.

### Project run (`mode=project`)

- **`project_run_id`** — numeric id of the project run.
- **`project_run_uuid`** — uuid of the project run.
- **`total_tests`** — total number of tests in the project run.
- **`tests_started`** — number of tests that were started.

## Example usage

```yaml
uses: sipfront/action-call-test@v0.0.7
with:
  public_key: '${{ secrets.SIPFRONT_PUBLIC_KEY }}'
  secret_key: '${{ secrets.SIPFRONT_SECRET_KEY }}'
  name: 'basic-call-a-b'
```
