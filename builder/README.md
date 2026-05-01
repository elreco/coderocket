# CodeRocket Builder

The builder compiles user projects and stores their output for previews and deployments.

## Local usage

From the repo root:

```bash
npm run builder:dev
```

Or from this directory:

```bash
npm run dev
```

## Environment

The builder reads:

- `BUILDER_HOST`
- `BUILDER_PORT`
- `BUILDER_AUTH_TOKEN`
- `BUILDER_STORAGE_DRIVER`
- `BUILDER_STORAGE_FS_ROOT`
- `BUILDER_TEMP_DIR`
- `BLOB_READ_WRITE_TOKEN`

Use `fs` storage for local/self-host installs. Use `vercel-blob` only if you intentionally want the cloud storage adapter.
Set `BUILDER_AUTH_TOKEN` in production so the app can authenticate requests to the builder API.

## Storage

- `fs`: writes build artifacts to the local filesystem.
- `vercel-blob`: uploads build artifacts to Vercel Blob.

## Notes

- The builder is integrated into the main repo so contributors can work on the full build/deploy loop in one place.
- Local development does not require Fly.io.
