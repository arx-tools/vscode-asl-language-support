# Publishing

The extension is published to the Visual Studio Code Marketplace as
**`arx-tools.arx-scripting-language-support`**.

## One time setup (the owner)

1. **The GitHub repository** — `github.com/arx-tools/vscode-asl-language-support`. The manifest
   links to it (`repository`, `bugs`, `homepage`), and the Marketplace shows those links.
2. **The publisher** — open <https://marketplace.visualstudio.com/manage> and create a publisher
   with the **ID `arx-tools`**. The ID has to match the `publisher` field of `package.json`, it
   cannot be changed later, and it is independent of the GitHub organisation (same name is fine).
3. **An Azure DevOps organization** — the PAT lives in an organization, and `https://dev.azure.com`
   alone only redirects to the marketing page (it is not the token page). Open
   <https://aex.dev.azure.com/me> instead: it signs you in and lists your organizations, and if the
   list is empty it offers *New organization* (free, no credit card, the name is only the URL).
   An existing organization is fine as well.

4. **A personal access token** — in the organization:
   `https://dev.azure.com/<organization>/_usersSettings/tokens` → *New Token*. Set the scope to
   **Marketplace → Manage** (under the *Marketplace* group) and pick an expiry. The token is shown
   once.

   > The PAT is tied to the account that owns the publisher: use the same sign-in as
   > <https://marketplace.visualstudio.com/manage>.

   > Global PATs (*All accessible organizations*) are being retired by Azure DevOps: the existing
   > ones stop working on 2027-01-27, and new global PATs cannot be created after 2026-12-01. When
   > that happens, either create an organization scoped PAT with the Marketplace scope (if the
   > portal allows it for your org) or publish with Microsoft Entra ID:
   > `npx vsce publish --azure-credential`.
5. **Log in with vsce** — it stores the token in the user profile, so this is a one time step:

   ```sh
   npx vsce login arx-tools
   ```

   Or pass it per command: `VSCE_PAT=… npm run publish:marketplace`. Check it without publishing:

   ```sh
   npx vsce verify-pat arx-tools
   ```

## Every release

1. **The version** — the number is approved in writing by the owner (the deploy rule of the
   project), then:

   ```sh
   npm version <major|minor|patch|x.y.z>
   ```

   The versioning follows the project rule: major = rewrite, minor = new feature, patch = bugfix.

2. **Check the package**:

   ```sh
   npm run vsix
   ```

   The output lists the files of the `.vsix`: `dist/extension.js`, `dist/package.json`,
   `syntaxes/asl.tmLanguage.json`, `snippets/asl.json`, `language-configuration.json`,
   `images/icon.png`, the README, the CHANGELOG and the LICENSE. Anything else is a bug of
   `.vscodeignore`.

3. **Publish**:

   ```sh
   npm run publish:marketplace
   ```

   It runs the gates (`lint`, `typecheck`, `test`), builds the bundle and uploads it. The
   `vscode:prepublish` script builds the bundle as well, so a plain `npx vsce publish` works too.

4. **Verify**:

   - <https://marketplace.visualstudio.com/items?itemName=arx-tools.arx-scripting-language-support>
   - `code --install-extension arx-tools.arx-scripting-language-support`
   - open an `.asl` file: the highlighting, the diagnostics and the completions have to work.

## Why the bundle is CommonJS

The sources are an ES module package (`"type": "module"`), so `node` runs the `.ts` files directly in
the tests and in the generator scripts. The extension host still loads the extensions as
**CommonJS** (VS Code 1.93 release notes: *"Extensions will continue to load as CommonJS"*), so
`scripts/build.ts` emits a CJS bundle and writes `dist/package.json` with `{"type": "commonjs"}`.
The `main` field of the manifest points to `./dist/extension.js`.

## Troubleshooting

| Symptom | Cause |
|---|---|
| `401 Unauthorized` | the PAT misses the **Marketplace → Manage** scope, or it expired |
| `403 Forbidden` / `not authorized to publish` | the PAT belongs to another organization than the publisher, or the `publisher` id is wrong |
| `ERROR Working tree has uncommitted changes` | commit first (`git status`), then publish |
| `ERROR Extension entrypoint(s) missing` | `dist/extension.js` was not built — run `npm run build` (or `npm run vsix`) |
| the icon is missing | `images/icon.png` has to be a PNG with at least 128×128 pixels, and it must not be in `.vscodeignore` |
| the Marketplace shows an old README | the README of the repository root is the listing, and it is read at publish time |

The `README.md` **is** the Marketplace listing: keep it in English, with the features, the settings
and the install steps.
