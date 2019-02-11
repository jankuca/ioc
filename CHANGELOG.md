# Changelog

## 3.0.0

### Breaking Changes

- `addServices()` and `addNewServices()` no longer accept group names.
  - Replace `addServices('name', services)` with `addGroupServices('name', services)`.

### Enhancements

- Added `addGroupServices()` and `addNewGroupServices()` to support behavior removed from `addServices()` and `addNewServices()`.

### Technical

- Tests for basic service instantiation added.
- CoffeeScript replaced with ES6 transpiled to ES5 via Babel.
- Added Flow type checker.
