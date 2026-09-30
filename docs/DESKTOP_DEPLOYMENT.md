# PharmaDesk Windows Deployment

## Runtime database configuration

The installed application reads `DATABASE_URL` from the process environment or `%APPDATA%\PharmaDesk.env`. Create that file for the Windows user who runs PharmaDesk:

```dotenv
DATABASE_URL=mongodb+srv://<database-user>:<encoded-password>@<cluster>/<database>?retryWrites=true&w=majority
```

Do not commit this file or place production credentials in `.env`, source code, the installer, or GitHub. Existing external `pharmadesk.json` configurations are still read for compatibility. The app log is written under the PharmaDesk user-data directory and redacts URI credentials.

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

Install `PharmaDesk Setup.exe` on a Windows PC without Node.js or this repository. Configure `%APPDATA%\PharmaDesk.env` with a valid MongoDB URL, start PharmaDesk, and confirm the log records a successful `/api/health` check. Verify login using an existing seeded account, then exercise inventory, purchases, sales, and reporting APIs. This external-PC test is separate from the build-time offline smoke test, which deliberately checks Prisma module loading without requiring a production database credential.