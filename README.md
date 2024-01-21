# sipfront-call-test Action

This action executes a Sipfront end-to-end call test.

## Inputs

### `public_key`

**Required** Your Sipfront API public key, get it from the [Sipfront App](https://app.sipfront.com/subscription/apikey).


### `secret_key`

**Required** Your Sipfront API secret key, get it from the [Sipfront App](https://app.sipfront.com/subscription/apikey).

### `name`

**Required** Your Sipfront test name to trigger.

### `destination`

**Optional** The destination to call, overriding the test configuration.

### `sf_environment`

**Optional** The Sipfront environment to use. For internal use during development of this action only. Possible values are `prod`, `dev` or `local`.

## Outputs

### `session_id`

The Sipfront test session id of the executed test run.


## Example usage

```yaml
uses: actions/sipfront-call-test@v0.0.1
with:
  public_key: '${{ secrets.SIPFRONT_PUBLIC_KEY}}'
  secret_key: '${{ secrets.SIPFRONT_SECRET_KEY}}'
  name: 'sipfront-a-b'
  destination: '439992002'
  sf_environment: 'dev'
```