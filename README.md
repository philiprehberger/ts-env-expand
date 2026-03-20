# @philiprehberger/env-expand

[![CI](https://github.com/philiprehberger/ts-env-expand/actions/workflows/ci.yml/badge.svg)](https://github.com/philiprehberger/ts-env-expand/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@philiprehberger/env-expand.svg)](https://www.npmjs.com/package/@philiprehberger/env-expand)
[![License](https://img.shields.io/github/license/philiprehberger/ts-env-expand)](LICENSE)

Interpolate variables within environment values. Supports `${VAR}`, `$VAR`, default values, alternate values, required values, and circular reference detection.

## Requirements

- Node.js >= 18

## Installation

```bash
npm install @philiprehberger/env-expand
```

## Usage

```typescript
import { expand, expandString } from '@philiprehberger/env-expand';

// Expand all variable references in an env record
const env = {
  HOST: 'localhost',
  PORT: '3000',
  BASE_URL: 'http://${HOST}:${PORT}',
  API_URL: '${BASE_URL}/api',
};

const result = expand(env);
// result.API_URL → 'http://localhost:3000/api'

// Default values
expand({ URL: '${HOST:-localhost}:${PORT:-8080}' });
// → { URL: 'localhost:8080' }

// Alternate values (use value only when variable IS set)
expand({ DEBUG: 'true', FLAG: '${DEBUG:+--verbose}' });
// → { DEBUG: 'true', FLAG: '--verbose' }

// Required values (throw if missing)
expand({ REF: '${SECRET:?Secret must be configured}' });
// throws MissingVariableError

// Expand a single template string
expandString('Hello, ${NAME}!', { NAME: 'world' });
// → 'Hello, world!'
```

## API

### `expand(env, options?)`

Expand variable references in all values of an environment record.

**Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `env` | `Record<string, string>` | Key-value pairs to expand |
| `options.inPlace` | `boolean` | Modify the input record in place (default: `false`) |
| `options.defaults` | `Record<string, string>` | Fallback variables (lower priority than env keys) |
| `options.maxDepth` | `number` | Maximum expansion depth (default: `50`) |

**Returns:** `Record<string, string>` — expanded environment record.

**Supported syntax:**

| Syntax | Description |
| --- | --- |
| `${VAR}` / `$VAR` | Substitute variable value (empty string if unset) |
| `${VAR:-default}` | Use `default` if `VAR` is unset or empty |
| `${VAR:+alternate}` | Use `alternate` only if `VAR` is set and non-empty |
| `${VAR:?error}` | Throw `MissingVariableError` if `VAR` is unset or empty |

### `expandString(template, vars?)`

Expand variable references within a single template string.

**Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `template` | `string` | The string containing variable references |
| `vars` | `Record<string, string>` | Variables available for substitution |

**Returns:** `string` — the expanded string.

### `CircularReferenceError`

Thrown when a circular variable reference is detected. Properties:

- `variable` — the variable that caused the cycle
- `chain` — the reference chain leading to the cycle

### `MissingVariableError`

Thrown when a required variable (`${VAR:?...}`) is not set. Properties:

- `variable` — the missing variable name

## Development

```bash
npm install
npm run build
npm run typecheck
npm test
```

## License

[MIT](./LICENSE)
