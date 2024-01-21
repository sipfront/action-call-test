/**
 * Unit tests for src/sipfront-api.js
 */
const { run_call_test } = require('../src/sipfront-api')
const { expect } = require('@jest/globals')

describe('sipfront-api.js', () => {
  it('run successful test call', async () => {
    const res = await run_call_test(
      'public-key',
      'secret-key',
      'sipfront-a-b',
      null,
      'dev'
    )
    expect(res.session_status).toBe('passed')
  }, 120000)
  it('run failed test call', async () => {
    const res = await run_call_test(
      'public-key',
      'secret-key',
      'sipfront-a-b',
      '12345',
      'dev'
    )
    expect(res.session_status).toBe('failed')
  }, 120000)
})
