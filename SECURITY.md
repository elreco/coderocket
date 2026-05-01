# Security Policy

## Reporting

Please do not open public issues for suspected vulnerabilities.

Use one of these private paths instead:

- GitHub Security Advisories for this repository
- direct contact with the maintainers before disclosure

## Scope

Security reports are especially helpful for:

- authentication and authorization flaws
- Supabase service-role exposure
- leaked secrets or sensitive environment defaults
- custom-domain verification bypasses
- builder sandbox and file access issues
- unauthenticated access to builder build, scraping, or screenshot endpoints

## Release hygiene

Before publishing or mirroring this repository publicly:

- rotate any secret that may have existed in tracked `.env` files
- verify no production dumps or tokens are committed
- review `.env.example` and deployment docs for accidental secret values
- set `BUILDER_AUTH_TOKEN` if the builder is reachable outside a trusted private network
