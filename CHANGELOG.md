# Changelog

All notable changes to this project will be documented in this file.

## 0.1.2

- Standardize package.json configuration

## 0.1.1

- Add CI workflow and badges to README

## [0.1.0] - 2026-03-20

### Added

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
