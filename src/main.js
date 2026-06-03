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
 * Parse a comma-separated list of integer ids.
 * @param {string} name The input name.
 * @returns {number[]} The parsed ids (empty if the input is unset).
 */
function id_list_input(name) {
  const raw = core.getInput(name, { required: false })
  if (!raw || raw.length === 0) {
    return []
  }
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => {
      const val = parseInt(s, 10)
      if (Number.isNaN(val) || val < 0) {
        throw new Error(`Invalid id '${s}' in input '${name}'`)
      }
      return val
    })
}

/**
 * Handle a single-test run: dispatch, then set the test-specific outputs.
 * @param {object} common Inputs shared across both modes.
 * @returns {Promise<void>} Resolves once outputs are set.
 */
async function run_test_mode(common) {
  const name = core.getInput('name', { required: true })
  const destination = core.getInput('destination', { required: false })

  let msg = `Running test '${name}'`
  if (destination) {
    msg += ` to destination '${destination}'`
  }
  if (common.sf_environment) {
    msg += ` in environment '${common.sf_environment}'`
  }
  core.debug(msg)

  const result = await api.run_call_test(
    common.public_key,
    common.secret_key,
    name,
    destination,
    common.report_mode,
    common.sf_environment,
    common.poll_interval,
    common.timeout
  )

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

  if (result.session_status === 'failed') {
    core.setFailed(result.result_description || 'Test run failed')
  }
}

/**
 * Handle a project run: dispatch, then set the project-specific outputs.
 * @param {object} common Inputs shared across both modes.
 * @returns {Promise<void>} Resolves once outputs are set.
 */
async function run_project_mode(common) {
  const project_id = core.getInput('project_id', { required: false })
  const project_name = core.getInput('project_name', { required: false })
  const test_ids = id_list_input('test_ids')

  if (!project_id && !project_name) {
    throw new Error("mode=project requires 'project_id' or 'project_name'")
  }

  let msg = `Running project '${project_id || project_name}'`
  if (test_ids.length) {
    msg += ` (tests ${test_ids.join(',')})`
  }
  if (common.sf_environment) {
    msg += ` in environment '${common.sf_environment}'`
  }
  core.debug(msg)

  const result = await api.run_project(
    common.public_key,
    common.secret_key,
    project_id,
    project_name,
    test_ids,
    common.report_mode,
    common.sf_environment,
    common.poll_interval,
    common.timeout
  )

  core.setOutput('project_run_id', result.project_run_id)
  core.setOutput('project_run_uuid', result.project_run_uuid)
  core.setOutput('status', result.run_status)
  core.setOutput('report_url', result.report_url || '')
  core.setOutput('project_id', result.project_id)
  core.setOutput('total_tests', result.total_tests)
  core.setOutput('tests_started', result.tests_started)
  core.setOutput('started_at', result.created_at)
  core.setOutput('stopped_at', result.stopped_at)

  if (result.run_status === 'failed' || result.run_status === 'stopped') {
    core.setFailed(`Project run ${result.run_status}`)
  }
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  try {
    const mode = (core.getInput('mode', { required: false }) || 'test')
      .trim()
      .toLowerCase()
    if (mode !== 'test' && mode !== 'project') {
      throw new Error(`Invalid value for input 'mode': '${mode}'`)
    }

    const common = {
      public_key: core.getInput('public_key', { required: true }),
      secret_key: core.getInput('secret_key', { required: true }),
      report_mode: core.getInput('report_mode', { required: false }),
      sf_environment: core.getInput('sf_environment', { required: false }),
      poll_interval: int_input('poll_interval', 3),
      timeout: int_input('timeout', 1800)
    }

    if (mode === 'project') {
      await run_project_mode(common)
    } else {
      await run_test_mode(common)
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message)
  }
}

module.exports = {
  run
}
