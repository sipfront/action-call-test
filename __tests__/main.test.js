/**
 * Unit tests for the action's main functionality, src/main.js
 */
const core = require('@actions/core')
const api = require('../src/sipfront-api')
const main = require('../src/main')

// Mock the GitHub Actions core library
const debugMock = jest.spyOn(core, 'debug').mockImplementation()
const getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
const setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
const setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation()

// Mock the action's main function
const runMock = jest.spyOn(main, 'run')

// Mock the network-facing API call so tests never hit the wire.
const runCallTestMock = jest.spyOn(api, 'run_call_test')

const inputs = {
  public_key: 'key',
  secret_key: 'secret',
  name: 'sipfront-a-b',
  destination: 'testdestination',
  sf_environment: 'dev'
}

const passedRun = {
  session_id: 'abc-123',
  status: 'passed',
  session_status: 'passed',
  result_description: 'All good',
  report_url: 'https://app.dev.sipfront.com/run/details/abc-123',
  test_id: 7,
  test_name: 'sipfront-a-b',
  project_id: 3,
  project_name: 'demo',
  testcase_name: 'basic-call-a-b',
  agentpool_name: 'eu-pool',
  started_at: '2026-06-03 10:00:00',
  stopped_at: '2026-06-03 10:01:00',
  tags: ['ci']
}

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getInputMock.mockImplementation(name => inputs[name] ?? '')
  })

  it('sets all outputs for a passed run', async () => {
    runCallTestMock.mockResolvedValue(passedRun)

    await main.run()
    expect(runMock).toHaveReturned()

    expect(setOutputMock).toHaveBeenCalledWith('session_id', 'abc-123')
    expect(setOutputMock).toHaveBeenCalledWith('status', 'passed')
    expect(setOutputMock).toHaveBeenCalledWith(
      'report_url',
      'https://app.dev.sipfront.com/run/details/abc-123'
    )
    expect(setOutputMock).toHaveBeenCalledWith('test_name', 'sipfront-a-b')
    expect(setOutputMock).toHaveBeenCalledWith('tags', '["ci"]')
    expect(setFailedMock).not.toHaveBeenCalled()
  })

  it('still sets outputs but fails the run on a failed session', async () => {
    runCallTestMock.mockResolvedValue({
      ...passedRun,
      status: 'failed',
      session_status: 'failed',
      result_description: 'No answer'
    })

    await main.run()
    expect(runMock).toHaveReturned()

    // Outputs (including report_url) must be set even on failure.
    expect(setOutputMock).toHaveBeenCalledWith('session_id', 'abc-123')
    expect(setOutputMock).toHaveBeenCalledWith(
      'report_url',
      passedRun.report_url
    )
    expect(setFailedMock).toHaveBeenCalledWith('No answer')
  })

  it('sets a failed status when the API call throws', async () => {
    runCallTestMock.mockRejectedValue(new Error('Test run denied'))

    await main.run()
    expect(runMock).toHaveReturned()

    expect(setFailedMock).toHaveBeenCalledWith('Test run denied')
  })

  it('fails on an invalid numeric input', async () => {
    getInputMock.mockImplementation(name => {
      if (name === 'poll_interval') return 'not-a-number'
      return inputs[name] ?? ''
    })

    await main.run()
    expect(runMock).toHaveReturned()

    expect(setFailedMock).toHaveBeenCalledWith(
      "Invalid value for input 'poll_interval': 'not-a-number'"
    )
    expect(runCallTestMock).not.toHaveBeenCalled()
  })

  // Reference the debug mock so lint does not flag it as unused.
  it('emits debug logging', async () => {
    runCallTestMock.mockResolvedValue(passedRun)
    await main.run()
    expect(debugMock).toHaveBeenCalled()
  })
})
