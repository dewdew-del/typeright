# Desktop app (Tauri 2, Windows)

The same React app, wrapped in a small native window. Tauri uses the WebView2 engine built into
Windows 10/11, so the installer is a few MB instead of shipping a whole browser.

## What is different on desktop
- **Email login only.** Google sign-in needs a browser redirect the app can't receive, so the button is hidden.
  People who signed up with Google can set a password in their profile on the website, then log in here.
- **Password reset links** open the website (Supabase's Site URL), not the app.
- **No service worker.** The app's files are inside the installer, so it works offline anyway.
- Detected in code with `IS_DESKTOP` from `src/lib/platform.ts`.
- If you turn on Turnstile, add `tauri.localhost` to the widget's hostnames as well.

## One-time setup on a new PC
1. Visual Studio 2022 Build Tools with **Desktop development with C++**:
   `winget install --id Microsoft.VisualStudio.2022.BuildTools -e --override "--quiet --wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"`
2. Rust: `winget install --id Rustlang.Rustup -e`, then open a new terminal and run `rustup default stable-msvc`.
3. WebView2 is already part of Windows 11.

## Commands
- `npm run desktop:dev`: opens the app window on top of the Vite dev server, with hot reload.
- `npm run desktop:build`: builds the website, then the Windows installer at
  `src-tauri/target/release/bundle/nsis/TypeRight_0.1.0_x64-setup.exe`.
  The first build compiles about 400 Rust crates and takes several minutes; later builds are fast.

The installer installs for the current user only (no admin prompt) and adds a Start menu entry.
It is not code-signed, so Windows SmartScreen shows "Windows protected your PC" on first run:
click **More info → Run anyway**. Signing certificates cost money, which is outside the ₱0 budget.

## Files
- `src-tauri/tauri.conf.json`: window size, content security policy, installer settings.
- `src-tauri/src/`: the Rust entry point (no custom commands; everything runs in the web app).
- `src-tauri/icons/`: generated from `public/favicon.svg` with `npx tauri icon public/favicon.svg`.
