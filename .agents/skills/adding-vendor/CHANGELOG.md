# Changelog

## [1.0.1] - 2026-07-09

### Added

- Added `executing-skills` as required dependency in frontmatter
- Added prerequisite alert after "When To Use" referencing executing-skills

## [1.0.0] - 2026-07-08

### Added

- Initial release of adding-vendor skill
- Pre-execution validation (git repo check, directory root, existing .gitmodules)
- Vendor installation: submodule creation, initialization, verification, registry update
- Maintenance workflow: update to latest remote
- Read-only guardrails: global gitignore and ignore tracking options
- Recovery protocol for modified vendor content