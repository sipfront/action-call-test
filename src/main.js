const core = require('@actions/core')
const api = require('./sipfront-api')

/**
 * Parse an integer input, falling back to a default when empty or invalid.
 * @param {string} name The input name.
 * @param {number} fallback The default value.
 * @returns {number} The parsed value or the fallback.
 */
function int_input(name, fallback) {
  const raw = core.getInput(name, { required: false })
  if (!raw || raw.length === 0) {
    return fallback
  }
  const val = parseInt(raw, 10)
  if (Number.isNaN(val) || val < 0) {
    throw new Error(`Invalid value for input '${name}': '${raw}'`)
  }
  return val
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  try {
    const public_key = core.getInput('public_key', { required: true })
    const secret_key = core.getInput('secret_key', { required: true })
    const name = core.getInput('name', { required: true })
    const destination = core.getInput('destination', { required: false })
    const report_mode = core.getInput('report_mode', { required: false })
    const sf_environment = core.getInput('sf_environment', { required: false })
    const poll_interval = int_input('poll_interval', 3)
    const timeout = int_input('timeout', 1800)

    // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
    let deb_log = `Running test '${name}'`
    if (destination) {
      deb_log += ` to destination '${destination}'`
    }
    if (sf_environment) {
      deb_log += ` in environment '${sf_environment}'`
    }
    core.debug(deb_log)

    const result = await api.run_call_test(
      public_key,
      secret_key,
      name,
      destination,
      report_mode,
      sf_environment,
      poll_interval,
      timeout
    )

    // Expose the full set of run details as action outputs.
    core.setOutput('session_id', result.session_id)
    core.setOutput('status', result.status || result.session_status)
    core.setOutput('result_description', result.result_description || '')
    core.setOutput('report_url', result.report_url || '')
    core.setOutput('test_id', result.test_id)
    core.setOutput('test_name', result.test_name)
    core.setOutput('project_id', result.project_id)
    core.setOutput('project_name', result.project_name)
    core.setOutput('testcase_name', result.testcase_name)
    core.setOutput('agentpool_name', result.agentpool_name)
    core.setOutput('started_at', result.started_at)
    core.setOutput('stopped_at', result.stopped_at)
    core.setOutput('tags', JSON.stringify(result.tags || []))

    // Fail the workflow run if the test session did not pass, but only after
    // the outputs above have been set so the report URL is still available.
    if (result.session_status === 'failed') {
      core.setFailed(result.result_description || 'Test run failed')
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message)
  }
}

module.exports = {
  run
}
