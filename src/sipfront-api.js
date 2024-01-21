const httpm = require('@actions/http-client')
const httpm_auth = require('@actions/http-client/lib/auth')

/**
 * Run a Sipfront test and wait for completion.
 *
 * @param {public_key} The public API key for the Sipfront API
 * @param {secret_key} The secret API key for the Sipfront API
 * @param {name} The Sipfront test name to run
 * @param {destination} The destination number in the
 * @param {name} The Sipfront test name to run
 * @returns {Promise<string>} Resolves with 'done!' after the wait is over.
 */
async function run_call_test(
  public_key,
  secret_key,
  name,
  destination,
  sf_environment
) {
  let api_base = 'https://app.sipfront.com'
  const api_path = '/api/v2/tests/run'
  if (sf_environment !== null) {
    if (sf_environment === 'dev') {
      api_base = 'https://app.dev.sipfront.com'
    } else if (sf_environment === 'local') {
      api_base = 'http://localhost:8000'
    }
  }

  const api_creds = new httpm_auth.BasicCredentialHandler(
    public_key,
    secret_key
  )
  const httpc = new httpm.HttpClient(
    'sipfront-gh-client', // user-agent
    [api_creds], // handlers
    { keepAlive: true } // request options
  )

  const data = {
    'test.name': name
  }
  if (destination !== null) {
    data['step.1.0.dial_destination'] = destination
  }

  const sf_res = await httpc.postJson(api_base + api_path, data)
  console.log(sf_res)

  let res = null
  do {
    res = await httpc.getJson(sf_res.result.data.status_url)
    console.log(res)
    await new Promise(r => setTimeout(r, 3000))
  } while (res.result.run.session_status === 'running')
  if (res.result.run.session_status === 'failed') {
    throw new Error(res.result.run.result_description)
  }

  return new Promise(resolve => {
    resolve(res.result.run)
  })
}

module.exports = { run_call_test }
