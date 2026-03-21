# Changelog

## 0.1.3

- Standardize README and CHANGELOG formatting

## 0.1.2

- Standardize package.json configuration

## 0.1.1

- Add CI workflow and badges to README

## 0.1.0

- `expand()` function to interpolate variable references in environment records
- `expandString()` function for single template string expansion
- Support for `${VAR}` and `$VAR` reference syntax
- Default values with `${VAR:-default}`
- Alternate values with `${VAR:+alternate}`
- Required values with `${VAR:?error}`
- Circular reference detection with `CircularReferenceError`
- `MissingVariableError` for required variable validation
- `inPlace` option to modify records in place
- `defaults` option for fallback variables
- `maxDepth` option to control expansion depth
