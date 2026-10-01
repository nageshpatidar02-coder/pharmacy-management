# PharmaDesk Windows Deployment

## Hosted app and database configuration

Installed Electron clients load the hosted PharmaDesk app at `https://pharmacy-management-bay.vercel.app` by default. They use its same-origin API, so Vercel is the only runtime that connects directly to MongoDB. Set `PHARMADESK_WEB_URL` to another HTTPS deployment when preparing a staging or alternate production build.

Configure `DATABASE_URL` as a protected environment variable in the Vercel project. Do not put it in the Electron installer, client environment files, source code, or GitHub. The desktop log records only whether the hosted health endpoint reports a successful database ping; database URI credentials are redacted from errors.

The MongoDB credential previously present in source must be rotated in MongoDB Atlas and updated in Vercel before releasing this build. If it was pushed to a remote Git repository, treat it as compromised even after removing it from the current source.

## Build and verify

Run from the repository root on Windows:

```powershell
npm ci
npm run build
```

The build generates Prisma, builds Next standalone, stages `desktop-app`, creates the NSIS installer, and verifies the unpacked server, Next runtime, generated Prisma client, Windows engine, assets, release metadata, absence of environment files, and an offline `/api/health` smoke test.

Artifacts are written to `dist/`, including `PharmaDesk Setup.exe`, `latest.yml`, the blockmap, and `win-unpacked/`.

## Publish a GitHub release

Bump the package version and commit the version files before publishing:

```powershell
npm version patch --no-git-tag-version
git add package.json package-lock.json
git commit -m "chore: bump PharmaDesk release version"
```

Provide `GH_TOKEN` to the release process through a protected local environment or CI secret, then run:

```powershell
npm run publish-release
```

The GitHub provider remains configured in `package.json`; no token is stored in the repository.

## Clean Windows PC test

Install `PharmaDesk Setup.exe` on a Windows PC without Node.js or this repository. Confirm the app reaches the hosted `/api/health` endpoint and logs a successful cloud database check, sign in with an existing account, then exercise inventory, purchases, sales, and reporting. This external-PC test is separate from the build-time standalone smoke test, which deliberately checks local server and Prisma module loading using a dummy unreachable MongoDB URL.