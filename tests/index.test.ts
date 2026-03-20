import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  expand,
  expandString,
  CircularReferenceError,
  MissingVariableError,
} from '../dist/index.js';

describe('expand', () => {
  it('should expand ${VAR} references', () => {
    const env = { HOST: 'localhost', URL: 'http://${HOST}:3000' };
    const result = expand(env);
    assert.strictEqual(result.URL, 'http://localhost:3000');
  });

  it('should expand $VAR references', () => {
    const env = { NAME: 'world', GREETING: 'hello $NAME' };
    const result = expand(env);
    assert.strictEqual(result.GREETING, 'hello world');
  });

  it('should expand chained references', () => {
    const env = {
      HOST: 'localhost',
      PORT: '3000',
      BASE: 'http://${HOST}:${PORT}',
      API: '${BASE}/api',
    };
    const result = expand(env);
    assert.strictEqual(result.API, 'http://localhost:3000/api');
  });

  it('should replace undefined variables with empty string', () => {
    const env = { URL: 'http://${MISSING}:3000' };
    const result = expand(env);
    assert.strictEqual(result.URL, 'http://:3000');
  });

  it('should not modify the original when inPlace is false', () => {
    const env = { HOST: 'localhost', URL: 'http://${HOST}' };
    const result = expand(env);
    assert.strictEqual(env.URL, 'http://${HOST}');
    assert.strictEqual(result.URL, 'http://localhost');
  });

  it('should modify in place when inPlace is true', () => {
    const env = { HOST: 'localhost', URL: 'http://${HOST}' };
    const result = expand(env, { inPlace: true });
    assert.strictEqual(env.URL, 'http://localhost');
    assert.strictEqual(result, env);
  });

  it('should use defaults for missing variables', () => {
    const env = { URL: 'http://${HOST}:3000' };
    const result = expand(env, { defaults: { HOST: 'fallback.local' } });
    assert.strictEqual(result.URL, 'http://fallback.local:3000');
  });

  it('should prefer env values over defaults', () => {
    const env = { HOST: 'primary', URL: 'http://${HOST}' };
    const result = expand(env, { defaults: { HOST: 'fallback' } });
    assert.strictEqual(result.URL, 'http://primary');
  });

  it('should return values with no references unchanged', () => {
    const env = { PLAIN: 'no references here' };
    const result = expand(env);
    assert.strictEqual(result.PLAIN, 'no references here');
  });
});

describe('expand — default values (${VAR:-default})', () => {
  it('should use default when variable is missing', () => {
    const env = { URL: '${HOST:-localhost}:3000' };
    const result = expand(env);
    assert.strictEqual(result.URL, 'localhost:3000');
  });

  it('should use default when variable is empty string', () => {
    const env = { HOST: '', URL: '${HOST:-fallback}' };
    const result = expand(env);
    assert.strictEqual(result.URL, 'fallback');
  });

  it('should use variable value when it is set', () => {
    const env = { HOST: 'myhost', URL: '${HOST:-fallback}' };
    const result = expand(env);
    assert.strictEqual(result.URL, 'myhost');
  });

  it('should expand references inside default values', () => {
    const env = { FALLBACK: 'backup', URL: '${HOST:-$FALLBACK}' };
    const result = expand(env);
    assert.strictEqual(result.URL, 'backup');
  });
});

describe('expand — alternate values (${VAR:+alternate})', () => {
  it('should use alternate when variable is set and non-empty', () => {
    const env = { DEBUG: 'true', FLAG: '${DEBUG:+--verbose}' };
    const result = expand(env);
    assert.strictEqual(result.FLAG, '--verbose');
  });

  it('should return empty when variable is missing', () => {
    const env = { FLAG: '${DEBUG:+--verbose}' };
    const result = expand(env);
    assert.strictEqual(result.FLAG, '');
  });

  it('should return empty when variable is empty string', () => {
    const env = { DEBUG: '', FLAG: '${DEBUG:+--verbose}' };
    const result = expand(env);
    assert.strictEqual(result.FLAG, '');
  });
});

describe('expand — required values (${VAR:?error})', () => {
  it('should return value when variable is set', () => {
    const env = { SECRET: 'abc123', REF: '${SECRET:?must be set}' };
    const result = expand(env);
    assert.strictEqual(result.REF, 'abc123');
  });

  it('should throw MissingVariableError when variable is missing', () => {
    const env = { REF: '${SECRET:?Secret is required}' };
    assert.throws(
      () => expand(env),
      (err: unknown) => {
        assert.ok(err instanceof MissingVariableError);
        assert.strictEqual(err.variable, 'SECRET');
        assert.strictEqual(err.message, 'Secret is required');
        return true;
      },
    );
  });

  it('should throw with default message when no error text provided', () => {
    const env = { REF: '${SECRET:?}' };
    assert.throws(
      () => expand(env),
      (err: unknown) => {
        assert.ok(err instanceof MissingVariableError);
        assert.strictEqual(err.variable, 'SECRET');
        assert.ok(err.message.includes('SECRET'));
        return true;
      },
    );
  });
});

describe('expand — circular reference detection', () => {
  it('should throw CircularReferenceError on direct self-reference', () => {
    const env = { A: '${A}' };
    assert.throws(
      () => expand(env),
      (err: unknown) => {
        assert.ok(err instanceof CircularReferenceError);
        assert.strictEqual(err.variable, 'A');
        return true;
      },
    );
  });

  it('should throw CircularReferenceError on indirect cycle', () => {
    const env = { A: '${B}', B: '${C}', C: '${A}' };
    assert.throws(
      () => expand(env),
      (err: unknown) => {
        assert.ok(err instanceof CircularReferenceError);
        return true;
      },
    );
  });

  it('should include the chain in the error', () => {
    const env = { X: '${Y}', Y: '${X}' };
    assert.throws(
      () => expand(env),
      (err: unknown) => {
        assert.ok(err instanceof CircularReferenceError);
        assert.ok(err.chain.length > 0);
        return true;
      },
    );
  });
});

describe('expandString', () => {
  it('should expand variables in a template string', () => {
    const result = expandString('Hello, ${NAME}!', { NAME: 'world' });
    assert.strictEqual(result, 'Hello, world!');
  });

  it('should expand $VAR syntax', () => {
    const result = expandString('$GREETING $NAME', {
      GREETING: 'Hi',
      NAME: 'there',
    });
    assert.strictEqual(result, 'Hi there');
  });

  it('should support default values', () => {
    const result = expandString('${HOST:-localhost}:${PORT:-8080}', {});
    assert.strictEqual(result, 'localhost:8080');
  });

  it('should replace missing variables with empty string', () => {
    const result = expandString('prefix-${MISSING}-suffix', {});
    assert.strictEqual(result, 'prefix--suffix');
  });

  it('should handle strings with no variables', () => {
    const result = expandString('no variables here', {});
    assert.strictEqual(result, 'no variables here');
  });

  it('should support nested variable references', () => {
    const result = expandString('${URL}/path', {
      URL: 'http://${HOST}',
      HOST: 'example.com',
    });
    assert.strictEqual(result, 'http://example.com/path');
  });
});
