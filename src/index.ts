/**
 * Options for variable expansion.
 */
export interface ExpandOptions {
  /**
   * Whether to modify the input record in place or return a new object.
   * @default false
   */
  inPlace?: boolean;

  /**
   * Additional variables to use during expansion (lower priority than env keys).
   */
  defaults?: Record<string, string>;

  /**
   * Maximum expansion depth before treating as a circular reference.
   * @default 50
   */
  maxDepth?: number;
}

/**
 * Error thrown when a circular reference is detected during expansion.
 */
export class CircularReferenceError extends Error {
  public readonly variable: string;
  public readonly chain: string[];

  constructor(variable: string, chain: string[]) {
    super(`Circular reference detected: ${[...chain, variable].join(' -> ')}`);
    this.name = 'CircularReferenceError';
    this.variable = variable;
    this.chain = chain;
  }
}

/**
 * Error thrown when a required variable is missing (${VAR:?error} syntax).
 */
export class MissingVariableError extends Error {
  public readonly variable: string;

  constructor(variable: string, message: string) {
    super(message || `Required variable "${variable}" is not set`);
    this.name = 'MissingVariableError';
    this.variable = variable;
  }
}

const VAR_PATTERN = /\$\{([^}]+)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g;

function parseModifier(expr: string): {
  name: string;
  operator: string | null;
  operand: string | null;
} {
  const colonIdx = expr.indexOf(':');
  if (colonIdx === -1) {
    return { name: expr, operator: null, operand: null };
  }

  const name = expr.slice(0, colonIdx);
  const rest = expr.slice(colonIdx + 1);

  if (rest.length === 0) {
    return { name: expr, operator: null, operand: null };
  }

  const operator = rest[0]!;
  const operand = rest.slice(1);

  if (operator === '-' || operator === '+' || operator === '?') {
    return { name, operator, operand };
  }

  return { name: expr, operator: null, operand: null };
}

function resolveValue(
  varName: string,
  env: Record<string, string>,
  defaults: Record<string, string>,
  resolving: string[],
  maxDepth: number,
): string {
  if (resolving.length > maxDepth) {
    throw new CircularReferenceError(varName, resolving);
  }

  if (resolving.includes(varName)) {
    throw new CircularReferenceError(varName, resolving);
  }

  const raw = env[varName] ?? defaults[varName];
  if (raw === undefined) {
    return '';
  }

  return expandSingle(raw, env, defaults, [...resolving, varName], maxDepth);
}

function expandSingle(
  value: string,
  env: Record<string, string>,
  defaults: Record<string, string>,
  resolving: string[],
  maxDepth: number,
): string {
  return value.replace(VAR_PATTERN, (_match, braced: string | undefined, bare: string | undefined) => {
    const expr = braced ?? bare ?? '';

    if (!braced) {
      return resolveValue(expr, env, defaults, resolving, maxDepth);
    }

    const { name, operator, operand } = parseModifier(expr);

    const resolved = resolveValue(name, env, defaults, resolving, maxDepth);
    const isEmpty = resolved === '';
    const isDefined = (env[name] ?? defaults[name]) !== undefined;

    switch (operator) {
      case '-':
        return isEmpty
          ? expandSingle(operand ?? '', env, defaults, resolving, maxDepth)
          : resolved;

      case '+':
        return !isEmpty && isDefined
          ? expandSingle(operand ?? '', env, defaults, resolving, maxDepth)
          : '';

      case '?':
        if (isEmpty || !isDefined) {
          throw new MissingVariableError(
            name,
            operand || `Required variable "${name}" is not set`,
          );
        }
        return resolved;

      default:
        return resolved;
    }
  });
}

/**
 * Expand variable references in all values of an environment record.
 *
 * Supports `${VAR}`, `$VAR`, `${VAR:-default}`, `${VAR:+alternate}`,
 * and `${VAR:?error}` syntax. Detects circular references.
 *
 * @param env - Record of environment key-value pairs.
 * @param options - Expansion options.
 * @returns A new record (or the same record if `inPlace` is true) with expanded values.
 */
export function expand(
  env: Record<string, string>,
  options: ExpandOptions = {},
): Record<string, string> {
  const { inPlace = false, defaults = {}, maxDepth = 50 } = options;
  const target = inPlace ? env : { ...env };

  for (const key of Object.keys(target)) {
    const value = target[key];
    if (value !== undefined) {
      target[key] = expandSingle(value, env, defaults, [key], maxDepth);
    }
  }

  return target;
}

/**
 * Expand variable references within a single template string.
 *
 * @param template - The string containing variable references.
 * @param vars - Variables available for substitution.
 * @returns The expanded string.
 */
export function expandString(
  template: string,
  vars: Record<string, string> = {},
): string {
  return expandSingle(template, vars, {}, [], 50);
}
