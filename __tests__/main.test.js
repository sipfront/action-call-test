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

// Mock the network-facing API calls so tests never hit the wire.
const runCallTestMock = jest.spyOn(api, 'run_call_test')
const runProjectMock = jest.spyOn(api, 'run_project')

const testInputs = {
  public_key: 'key',
  secret_key: 'secret',
  name: 'sipfront-a-b',
  destination: 'testdestination',
  sf_environment: 'dev'
}

const projectInputs = {
  public_key: 'key',
  secret_key: 'secret',
  mode: 'project',
  project_id: '42',
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

const passedProjectRun = {
  project_run_id: 99,
  project_run_uuid: 'd679760c-0bda-4919-93fd-6efbfc465bd3',
  run_status: 'passed',
  report_url:
    'https://app.dev.sipfront.com/projectrun/d679760c-0bda-4919-93fd-6efbfc465bd3/details',
  project_id: 42,
  total_tests: 3,
  tests_started: 3,
  created_at: '2026-06-03 10:00:00',
  stopped_at: '2026-06-03 10:05:00'
}

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('mode=test', () => {
    beforeEach(() => {
      getInputMock.mockImplementation(name => testInputs[name] ?? '')
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
        return testInputs[name] ?? ''
      })

      await main.run()
      expect(runMock).toHaveReturned()

      expect(setFailedMock).toHaveBeenCalledWith(
        "Invalid value for input 'poll_interval': 'not-a-number'"
      )
      expect(runCallTestMock).not.toHaveBeenCalled()
    })

    it('emits debug logging', async () => {
      runCallTestMock.mockResolvedValue(passedRun)
      await main.run()
      expect(debugMock).toHaveBeenCalled()
    })
  })

  describe('mode=project', () => {
    beforeEach(() => {
      getInputMock.mockImplementation(name => projectInputs[name] ?? '')
    })

    it('sets project outputs for a passed project run', async () => {
      runProjectMock.mockResolvedValue(passedProjectRun)

      await main.run()
      expect(runMock).toHaveReturned()

      expect(runProjectMock).toHaveBeenCalled()
      expect(runCallTestMock).not.toHaveBeenCalled()
      expect(setOutputMock).toHaveBeenCalledWith('project_run_id', 99)
      expect(setOutputMock).toHaveBeenCalledWith(
        'project_run_uuid',
        'd679760c-0bda-4919-93fd-6efbfc465bd3'
      )
      expect(setOutputMock).toHaveBeenCalledWith('status', 'passed')
      expect(setOutputMock).toHaveBeenCalledWith('total_tests', 3)
      expect(setOutputMock).toHaveBeenCalledWith(
        'report_url',
        passedProjectRun.report_url
      )
      expect(setFailedMock).not.toHaveBeenCalled()
    })

    it('passes a test_ids subset to the API', async () => {
      getInputMock.mockImplementation(name => {
        if (name === 'test_ids') return '1, 2 ,3'
        return projectInputs[name] ?? ''
      })
      runProjectMock.mockResolvedValue(passedProjectRun)

      await main.run()
      expect(runProjectMock).toHaveBeenCalledWith(
        'key',
        'secret',
        '42',
        '',
        [1, 2, 3],
        '',
        'dev',
        3,
        1800
      )
    })

    it('runs a project by name when no id is given', async () => {
      getInputMock.mockImplementation(name => {
        if (name === 'project_id') return ''
        if (name === 'project_name') return 'my-project'
        return projectInputs[name] ?? ''
      })
      runProjectMock.mockResolvedValue(passedProjectRun)

      await main.run()
      expect(runProjectMock).toHaveBeenCalledWith(
        'key',
        'secret',
        '',
        'my-project',
        [],
        '',
        'dev',
        3,
        1800
      )
      expect(setFailedMock).not.toHaveBeenCalled()
    })

    it('fails when neither project_id nor project_name is given', async () => {
      getInputMock.mockImplementation(name => {
        if (name === 'project_id') return ''
        return projectInputs[name] ?? ''
      })

      await main.run()
      expect(setFailedMock).toHaveBeenCalledWith(
        "mode=project requires 'project_id' or 'project_name'"
      )
      expect(runProjectMock).not.toHaveBeenCalled()
    })

    it('fails the run when the project run failed', async () => {
      runProjectMock.mockResolvedValue({
        ...passedProjectRun,
        run_status: 'failed'
      })

      await main.run()
      expect(setOutputMock).toHaveBeenCalledWith(
        'report_url',
        passedProjectRun.report_url
      )
      expect(setFailedMock).toHaveBeenCalledWith('Project run failed')
    })
  })

  it('fails on an unknown mode', async () => {
    getInputMock.mockImplementation(name => {
      if (name === 'mode') return 'bogus'
      return testInputs[name] ?? ''
    })

    await main.run()
    expect(setFailedMock).toHaveBeenCalledWith(
      "Invalid value for input 'mode': 'bogus'"
    )
  })
})
