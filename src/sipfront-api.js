const core = require('@actions/core')
const httpm = require('@actions/http-client')
const httpm_auth = require('@actions/http-client/lib/auth')

/**
 * Resolve the API base URL for the given environment.
 *
 * @param {string} sf_environment One of 'dev', 'local' or empty for production.
 * @returns {string} The base URL of the Sipfront API.
 */
function api_base_for(sf_environment) {
  if (sf_environment && sf_environment.length > 0) {
    if (sf_environment === 'dev') {
      return 'https://app.dev.sipfront.com'
    } else if (sf_environment === 'local') {
      return 'http://localhost:8000'
    }
  }
  return 'https://app.sipfront.com'
}

/**
 * Extract a useful error message from a Sipfront API JSON response.
 *
 * @param {object} response The parsed response from postJson/getJson.
 * @param {string} fallback Fallback message if no error field is present.
 * @returns {string} The error message to surface to the user.
 */
function api_error_message(response, fallback) {
  const body = response && response.result
  if (body && typeof body === 'object') {
    if (body.error) return body.error
    if (body.description) return body.description
  }
  return fallback
}

/**
 * Build an authenticated Sipfront HTTP client.
 *
 * @param {string} public_key The public API key.
 * @param {string} secret_key The secret API key.
 * @returns {httpm.HttpClient} A configured HTTP client.
 */
function make_client(public_key, secret_key) {
  const api_creds = new httpm_auth.BasicCredentialHandler(
    public_key,
    secret_key
  )
  return new httpm.HttpClient(
    'sipfront-gh-client', // user-agent
    [api_creds], // handlers
    { keepAlive: true } // request options
  )
}

/**
 * Throw if an HTTP response is not a 2xx, using the API error message.
 *
 * @param {object} response The parsed response.
 * @param {string} what Short description of the operation for the fallback.
 */
function assert_ok(response, what) {
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(
      api_error_message(response, `${what} (HTTP ${response.statusCode})`)
    )
  }
}

/**
 * Poll a status URL until the run is no longer 'running'.
 *
 * @param {httpm.HttpClient} httpc The HTTP client.
 * @param {string} status_url The URL to poll.
 * @param {string} status_field Field on the run object holding the status.
 * @param {number} poll_interval Seconds between polls.
 * @param {number} timeout Maximum seconds to wait (0 disables).
 * @returns {Promise<object>} The final run object.
 */
async function poll_status(
  httpc,
  status_url,
  status_field,
  poll_interval,
  timeout
) {
  const interval_ms = poll_interval * 1000
  const deadline = timeout > 0 ? Date.now() + timeout * 1000 : null

  let run = null
  do {
    if (deadline !== null && Date.now() >= deadline) {
      throw new Error(
        `Timed out after ${timeout}s waiting for the run to finish`
      )
    }

    const res = await httpc.getJson(status_url)
    core.debug(JSON.stringify(res))
    assert_ok(res, 'Failed to fetch status')

    if (!res.result || !res.result.run) {
      throw new Error(
        api_error_message(
          res,
          'Unexpected response from Sipfront API: missing run status'
        )
      )
    }

    run = res.result.run
    if (run[status_field] !== 'running') {
      break
    }

    await new Promise(r => setTimeout(r, interval_ms))
    // eslint-disable-next-line no-constant-condition
  } while (true)

  return run
}

/**
 * Run a single Sipfront test and wait for completion.
 *
 * @param {string} public_key The public API key for the Sipfront API.
 * @param {string} secret_key The secret API key for the Sipfront API.
 * @param {string} name The Sipfront test name to run.
 * @param {string} destination Optional destination overriding the test config.
 * @param {string} report_mode Optional report mode ('full', 'kiosk', 'print').
 * @param {string} sf_environment Internal environment selector for testing.
 * @param {number} poll_interval Seconds to wait between status polls.
 * @param {number} timeout Maximum seconds to wait for the run to finish.
 * @returns {Promise<object>} Resolves with the finished run object, augmented
 *   with `report_url` from the dispatch response.
 */
async function run_call_test(
  public_key,
  secret_key,
  name,
  destination,
  report_mode,
  sf_environment,
  poll_interval,
  timeout
) {
  const api_base = api_base_for(sf_environment)
  const httpc = make_client(public_key, secret_key)

  const data = {
    'test.name': name
  }
  if (destination && destination.length > 0) {
    data['step.1.0.dial_destination'] = destination
  }
  if (report_mode && report_mode.length > 0) {
    data['report.mode'] = report_mode
  }

  const sf_res = await httpc.postJson(`${api_base}/api/v2/tests/run`, data)
  core.debug(JSON.stringify(sf_res))
  assert_ok(sf_res, 'Failed to trigger test run')

  if (!sf_res.result || !sf_res.result.data || !sf_res.result.data.status_url) {
    throw new Error(
      api_error_message(
        sf_res,
        'Unexpected response from Sipfront API: missing status URL'
      )
    )
  }

  const run = await poll_status(
    httpc,
    sf_res.result.data.status_url,
    'session_status',
    poll_interval,
    timeout
  )
  run.report_url = sf_res.result.data.report_url

  return run
}

/**
 * Run a whole Sipfront project and wait for completion.
 *
 * @param {string} public_key The public API key for the Sipfront API.
 * @param {string} secret_key The secret API key for the Sipfront API.
 * @param {string} project_id The id of the project to run.
 * @param {number[]} test_ids Optional subset of test ids to run.
 * @param {string} report_mode Optional report mode ('full' or 'kiosk').
 * @param {string} sf_environment Internal environment selector for testing.
 * @param {number} poll_interval Seconds to wait between status polls.
 * @param {number} timeout Maximum seconds to wait for the run to finish.
 * @returns {Promise<object>} Resolves with the finished project run object,
 *   augmented with `report_url`, `project_run_id` and `project_run_uuid`.
 */
async function run_project(
  public_key,
  secret_key,
  project_id,
  test_ids,
  report_mode,
  sf_environment,
  poll_interval,
  timeout
) {
  const api_base = api_base_for(sf_environment)
  const httpc = make_client(public_key, secret_key)

  const data = {
    id: Number(project_id)
  }
  if (report_mode && report_mode.length > 0) {
    data['report.mode'] = report_mode
  }
  if (Array.isArray(test_ids) && test_ids.length > 0) {
    data.test_ids = test_ids
  }

  const sf_res = await httpc.postJson(`${api_base}/api/v2/projects/run`, data)
  core.debug(JSON.stringify(sf_res))
  assert_ok(sf_res, 'Failed to trigger project run')

  if (!sf_res.result || !sf_res.result.data || !sf_res.result.data.status_url) {
    throw new Error(
      api_error_message(
        sf_res,
        'Unexpected response from Sipfront API: missing status URL'
      )
    )
  }

  const run = await poll_status(
    httpc,
    sf_res.result.data.status_url,
    'run_status',
    poll_interval,
    timeout
  )
  run.report_url = sf_res.result.data.report_url
  run.project_run_id = sf_res.result.data.project_run_id
  run.project_run_uuid = sf_res.result.data.project_run_uuid

  return run
}

module.exports = { run_call_test, run_project }
