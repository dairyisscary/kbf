# KBF

This repo houses the Kim-Butler finance app.

## Build for Production

```shell
nix build
```

## Development

Via Nix shell:

```shell
nix develop --impure
# Or if you have direnv
direnv allow
```

### Recipes

```shell
# Run a dev server with Postgres
dev

# Generate type definitions for Postgres tables
generate-db-types

# Migrate Postgres
migrate

# Format
prettier -w .

# Lint
pnpm exec eslint .

# Typecheck
pnpm exec tsc
```
