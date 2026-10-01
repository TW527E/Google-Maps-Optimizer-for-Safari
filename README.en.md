[繁體中文](https://github.com/TW527E/Google-Maps-Optimizer-for-Safari/blob/main/README.md) | [English](https://github.com/TW527E/Google-Maps-Optimizer-for-Safari/blob/main/README.en.md)

# Google Maps Optimizer for Safari

A Tampermonkey userscript for Safari that improves the responsiveness of zooming, panning, and interface interactions in the Google Maps website.

The script provides an automatic fallback for the Safari 26 and 27 Worker WebGL/OffscreenCanvas stutter path and temporarily reduces unnecessary UI rendering work while the user interacts with the map.

## Quick Install

**[Install the script from Greasy Fork](https://greasyfork.org/en/scripts/589350-google-maps-optimizer-for-safari)**

## Features

- In Balanced mode on Safari 26/27, automatically disables the Worker OffscreenCanvas path so Google Maps uses its main-thread Canvas/WebGL fallback renderer.
- Temporarily shortens UI animations and transitions during panning, wheel zooming, touch, and keyboard interaction.
- Reduces extra compositing work from translucent blur, shadows, and scroll bounce.
- Applies asynchronous image decoding while the browser is idle to avoid blocking primary interactions.
- Maximum Performance mode additionally lazy-loads large Google place photos and reduces UI motion.
- Activates optimizations only in Safari and leaves Google Maps unchanged in other browsers.
- Collects no data, adds no tracking, and makes no additional network requests.

## Requirements

- macOS
- Safari
- Tampermonkey for Safari
- The Google Maps website

The latest Safari release is recommended. The Worker Canvas workaround is enabled automatically only on Safari 26 and 27 by default.

## Installation

1. Install and enable [Tampermonkey](https://www.tampermonkey.net/) in Safari.
2. Open the [Greasy Fork script page](https://greasyfork.org/en/scripts/589350-google-maps-optimizer-for-safari).
3. Select the install option and confirm it in Tampermonkey.
4. Reload [Google Maps](https://www.google.com/maps).

Alternatively, create a new userscript from the Tampermonkey dashboard and manually paste the complete contents of [`google-maps-safari-optimizer.user.js`](https://github.com/TW527E/Google-Maps-Optimizer-for-Safari/blob/main/google-maps-safari-optimizer.user.js).

## Performance Modes

Use Tampermonkey's script menu to switch modes. Google Maps reloads automatically after a mode change.

| Mode | Worker Canvas workaround | Interaction boost | Image optimization | Reduced motion |
|---|---:|---:|---:|---:|
| Balanced (default) | Safari 26/27 | Yes | Async decoding | During interaction |
| Maximum Performance | Forced | Yes | Async decoding and large-photo lazy loading | Yes |
| Compatibility | No | No | No | No |
| Disabled | No | No | No | No |

If the map does not render correctly in Balanced mode, select Compatibility mode. If another Safari release still stutters, try Maximum Performance mode.

## Diagnostics

Select **Show optimization diagnostics** from Tampermonkey's script menu to inspect:

- Safari version
- Active mode
- WebGL availability
- Worker Canvas workaround status
- Number of optimized images

You can also run this in the Safari Web Inspector Console:

```js
__GMOS__.diagnostics()
```

The menu labels currently follow the Traditional Chinese interface used by the script.

## How It Works

The script uses `@run-at document-start` and Tampermonkey's `@sandbox raw` mode so it runs before Google Maps selects a renderer.

On affected Safari versions, it makes page-level `OffscreenCanvas` and `transferControlToOffscreen()` feature detection fail, prompting Google Maps to choose a regular Canvas/WebGL fallback path. It does not disable main-thread WebGL.

The remaining optimizations only adjust Google Maps UI effects and image-decoding hints. They do not modify search results, routes, account data, or map content.

## Limitations

A userscript cannot replace Safari's WebKit engine with Chrome's Chromium engine, so identical performance across every hardware configuration and Safari release cannot be guaranteed. This script focuses on rendering and UI costs that can be addressed at the webpage level.

## Files

- [`google-maps-safari-optimizer.user.js`](https://github.com/TW527E/Google-Maps-Optimizer-for-Safari/blob/main/google-maps-safari-optimizer.user.js) — Tampermonkey userscript
- [`README.md`](https://github.com/TW527E/Google-Maps-Optimizer-for-Safari/blob/main/README.md) — Traditional Chinese documentation
- [`README.en.md`](https://github.com/TW527E/Google-Maps-Optimizer-for-Safari/blob/main/README.en.md) — English documentation
- [`LICENSE`](https://github.com/TW527E/Google-Maps-Optimizer-for-Safari/blob/main/LICENSE) — MIT License

## License

This project is licensed under the [MIT License](https://github.com/TW527E/Google-Maps-Optimizer-for-Safari/blob/main/LICENSE).
