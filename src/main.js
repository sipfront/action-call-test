const core = require('@actions/core')
const { run_call_test } = require('./sipfront-api')

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
    const sf_environment = core.getInput('sf_environment', { required: false })

    // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
    let deb_log = `Running test '${name}'`
    if (destination) {
      deb_log += ` to destination '${destination}'`
    }
    if (sf_environment) {
      deb_log += ` in environment '${sf_environment}'`
    }
    core.debug(deb_log)

    const res = await run_call_test(
      public_key,
      secret_key,
      name,
      destination,
      sf_environment
    )
    core.debug(res)

    core.setOutput('session_id', res.session_id)
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message)
  }
}

module.exports = {
  run
}
