// ==UserScript==
// @name         Google Maps Safari 流暢度最佳化
// @name:en      Google Maps Optimizer for Safari
// @name:zh-TW   Google Maps Safari 流暢度最佳化
// @namespace    https://github.com/TW527E/Google-Maps-Optimizer-for-Safari
// @version      1.0.0
// @description  改善 Safari 上 Google Maps 的縮放、拖曳與介面反應速度，並繞過 Safari 26/27 的 Worker WebGL 卡頓問題。
// @description:en Improves Google Maps zooming, panning, and interface responsiveness in Safari, including a Safari 26/27 Worker WebGL workaround.
// @description:zh-TW 改善 Safari 上 Google Maps 的縮放、拖曳與介面反應速度，並繞過 Safari 26/27 的 Worker WebGL 卡頓問題。
// @author       TW527E
// @homepageURL  https://github.com/TW527E/Google-Maps-Optimizer-for-Safari
// @supportURL   https://github.com/TW527E/Google-Maps-Optimizer-for-Safari/issues
// @include      /^https:\/\/(?:www\.)?google\.[a-z.]+\/maps(?:[\/?#]|$)/
// @include      /^https:\/\/maps\.google\.[a-z.]+\/.*/
// @run-at       document-start
// @sandbox      raw
// @noframes
// @compatible   safari
// @license      MIT
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(() => {
  'use strict';

  const SCRIPT_NAME = 'Google Maps Safari 流暢度最佳化';
  const SCRIPT_VERSION = '1.0.0';
  const STORAGE_KEY = 'gmos-settings-v1';
  const INTERACTION_COOLDOWN_MS = 180;

  const userAgent = navigator.userAgent;
  const isSafari = /Safari\//.test(userAgent)
    && /Apple Computer/.test(navigator.vendor)
    && !/(?:Chrome|Chromium|CriOS|Edg|OPR|FxiOS)\//.test(userAgent);
  const safariMajor = Number.parseInt(userAgent.match(/Version\/(\d+)/)?.[1] ?? '0', 10);
  const needsWorkerCanvasFix = isSafari && safariMajor >= 26 && safariMajor <= 27;

  const PRESETS = Object.freeze({
    compatibility: Object.freeze({
      workerCanvasFix: false,
      interactionBoost: false,
      reduceEffects: false,
      optimizeImages: false,
      lazyPhotos: false,
      reduceMotion: false,
    }),
    balanced: Object.freeze({
      workerCanvasFix: needsWorkerCanvasFix,
      interactionBoost: true,
      reduceEffects: true,
      optimizeImages: true,
      lazyPhotos: false,
      reduceMotion: false,
    }),
    maximum: Object.freeze({
      workerCanvasFix: true,
      interactionBoost: true,
      reduceEffects: true,
      optimizeImages: true,
      lazyPhotos: true,
      reduceMotion: true,
    }),
    disabled: Object.freeze({
      workerCanvasFix: false,
      interactionBoost: false,
      reduceEffects: false,
      optimizeImages: false,
      lazyPhotos: false,
      reduceMotion: false,
    }),
  });

  const MODE_LABELS = Object.freeze({
    compatibility: '相容模式',
    balanced: '平衡模式',
    maximum: '最高效能',
    disabled: '停用',
  });
  const MODE_ORDER = Object.freeze(['compatibility', 'balanced', 'maximum', 'disabled']);

  function readStoredSettings() {
    try {
      const value = typeof GM_getValue === 'function'
        ? GM_getValue(STORAGE_KEY, null)
        : JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return value && typeof value === 'object' ? value : {};
    } catch (error) {
      console.debug(`[GMOS] 無法讀取設定：${String(error)}`);
      return {};
    }
  }

  function writeStoredSettings(value) {
    try {
      if (typeof GM_setValue === 'function') {
        GM_setValue(STORAGE_KEY, value);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      }
      return true;
    } catch (error) {
      console.warn(`[GMOS] 無法儲存設定：${String(error)}`);
      return false;
    }
  }

  const storedSettings = readStoredSettings();
  const mode = Object.hasOwn(PRESETS, storedSettings.mode) ? storedSettings.mode : 'balanced';
  const settings = Object.freeze({ mode, ...PRESETS[mode] });

  const runtime = {
    workerCanvasFixAttempted: false,
    workerCanvasFixApplied: false,
    offscreenCanvasHidden: false,
    transferMethodHidden: false,
    optimizedImages: 0,
  };

  /**
   * Safari 26/27 的 Worker WebGL 路徑會讓 Google Maps 在縮放時嚴重卡頓。
   * 在 Maps 做功能偵測前隱藏 OffscreenCanvas，讓它改用主執行緒的 Canvas/WebGL
   * 後備渲染器。這比攔截 Worker 或改寫 WebGL 呼叫安全，也不會停用一般 WebGL。
   */
  function installWorkerCanvasWorkaround() {
    runtime.workerCanvasFixAttempted = true;

    try {
      if ('OffscreenCanvas' in window) {
        const descriptor = Object.getOwnPropertyDescriptor(window, 'OffscreenCanvas');
        if (!descriptor || descriptor.configurable) {
          Object.defineProperty(window, 'OffscreenCanvas', {
            configurable: true,
            enumerable: descriptor?.enumerable ?? false,
            writable: true,
            value: undefined,
          });
          runtime.offscreenCanvasHidden = typeof window.OffscreenCanvas === 'undefined';
        } else if (descriptor.writable) {
          window.OffscreenCanvas = undefined;
          runtime.offscreenCanvasHidden = typeof window.OffscreenCanvas === 'undefined';
        }
      }
    } catch (error) {
      console.debug(`[GMOS] 無法隱藏 OffscreenCanvas：${String(error)}`);
    }

    try {
      const canvasPrototype = window.HTMLCanvasElement?.prototype;
      if (canvasPrototype && 'transferControlToOffscreen' in canvasPrototype) {
        const descriptor = Object.getOwnPropertyDescriptor(canvasPrototype, 'transferControlToOffscreen');
        if (!descriptor || descriptor.configurable) {
          Object.defineProperty(canvasPrototype, 'transferControlToOffscreen', {
            configurable: true,
            enumerable: descriptor?.enumerable ?? false,
            writable: true,
            value: undefined,
          });
          runtime.transferMethodHidden = typeof canvasPrototype.transferControlToOffscreen === 'undefined';
        } else if (descriptor.writable) {
          canvasPrototype.transferControlToOffscreen = undefined;
          runtime.transferMethodHidden = typeof canvasPrototype.transferControlToOffscreen === 'undefined';
        }
      }
    } catch (error) {
      console.debug(`[GMOS] 無法隱藏 transferControlToOffscreen：${String(error)}`);
    }

    runtime.workerCanvasFixApplied = runtime.offscreenCanvasHidden || runtime.transferMethodHidden;
  }

  if (isSafari && settings.workerCanvasFix) {
    installWorkerCanvasWorkaround();
  }

  const OPTIMIZER_CSS = `
    html.gmos-reduce-effects [style*="backdrop-filter"],
    html.gmos-reduce-effects [style*="backdropFilter"] {
      -webkit-backdrop-filter: none !important;
      backdrop-filter: none !important;
    }

    html.gmos-interacting,
    html.gmos-interacting * {
      scroll-behavior: auto !important;
    }

    html.gmos-active,
    html.gmos-active body {
      overscroll-behavior: none;
    }

    html.gmos-interacting body *:not(canvas):not([aria-busy="true"]):not([role="progressbar"]) {
      transition-delay: 0s !important;
      transition-duration: 0.01ms !important;
      animation-delay: 0s !important;
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
    }

    html.gmos-interacting.gmos-reduce-effects :is(
      button,
      [role="button"],
      [role="dialog"],
      [role="menu"],
      [role="listbox"]
    ) {
      -webkit-backdrop-filter: none !important;
      backdrop-filter: none !important;
      box-shadow: none !important;
    }

    html.gmos-reduce-motion {
      scroll-behavior: auto !important;
    }

    html.gmos-reduce-motion :is(
      button,
      [role="button"],
      [role="dialog"],
      [role="menu"],
      [role="listbox"],
      [role="tooltip"]
    ) {
      transition-delay: 0s !important;
      transition-duration: 0.01ms !important;
      animation-delay: 0s !important;
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
    }

    #gmos-startup-toast {
      position: fixed;
      z-index: 2147483647;
      right: 16px;
      bottom: 16px;
      max-width: min(340px, calc(100vw - 32px));
      padding: 9px 12px;
      border: 1px solid rgba(0, 0, 0, 0.12);
      border-radius: 9px;
      background: rgba(32, 33, 36, 0.92);
      color: #fff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.24);
      font: 12px/1.4 -apple-system, BlinkMacSystemFont, sans-serif;
      pointer-events: none;
      opacity: 1;
      transition: opacity 180ms ease;
    }
  `;

  function addStyle(css) {
    const style = document.createElement('style');
    style.id = 'gmos-optimizer-style';
    style.textContent = css;
    (document.head || document.documentElement).append(style);
  }

  function applyRootClasses() {
    const root = document.documentElement;
    if (!root) return;
    root.classList.toggle('gmos-active', settings.mode !== 'disabled');
    root.classList.toggle('gmos-reduce-effects', settings.reduceEffects);
    root.classList.toggle('gmos-reduce-motion', settings.reduceMotion);
    root.dataset.gmosMode = settings.mode;
  }

  function installInteractionBoost() {
    const root = document.documentElement;
    let timeoutId = 0;
    let pointerIsDown = false;

    const beginInteraction = () => {
      root.classList.add('gmos-interacting');
      window.clearTimeout(timeoutId);
      if (!pointerIsDown) {
        timeoutId = window.setTimeout(() => {
          root.classList.remove('gmos-interacting');
        }, INTERACTION_COOLDOWN_MS);
      }
    };

    const endPointerInteraction = () => {
      pointerIsDown = false;
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        root.classList.remove('gmos-interacting');
      }, INTERACTION_COOLDOWN_MS);
    };

    window.addEventListener('pointerdown', () => {
      pointerIsDown = true;
      beginInteraction();
    }, { capture: true, passive: true });
    window.addEventListener('pointerup', endPointerInteraction, { capture: true, passive: true });
    window.addEventListener('pointercancel', endPointerInteraction, { capture: true, passive: true });
    window.addEventListener('blur', endPointerInteraction, { passive: true });
    window.addEventListener('wheel', beginInteraction, { capture: true, passive: true });
    window.addEventListener('touchmove', beginInteraction, { capture: true, passive: true });
    window.addEventListener('keydown', beginInteraction, { capture: true, passive: true });
  }

  function installImageOptimizer() {
    const pendingImages = new Set();
    let idleHandle = 0;

    const runWhenIdle = window.requestIdleCallback
      ? (callback) => window.requestIdleCallback(callback, { timeout: 800 })
      : (callback) => window.setTimeout(callback, 120);

    const optimizeBatch = () => {
      idleHandle = 0;
      let processed = 0;
      for (const image of pendingImages) {
        pendingImages.delete(image);
        if (!image.isConnected || image.dataset.gmosOptimized === '1') continue;

        image.decoding = 'async';
        image.dataset.gmosOptimized = '1';
        runtime.optimizedImages += 1;

        if (settings.lazyPhotos) {
          const source = image.currentSrc || image.src || '';
          const width = Number(image.getAttribute('width')) || image.width;
          const height = Number(image.getAttribute('height')) || image.height;
          const isGooglePhoto = /(?:googleusercontent\.com|ggpht\.com)/i.test(source);
          if (isGooglePhoto && (width >= 160 || height >= 100)) {
            image.loading = 'lazy';
            image.fetchPriority = 'low';
          }
        }

        processed += 1;
        if (processed >= 80) break;
      }

      if (pendingImages.size > 0 && !idleHandle) {
        idleHandle = runWhenIdle(optimizeBatch);
      }
    };

    const enqueue = (node) => {
      if (!(node instanceof Element)) return;
      if (node instanceof HTMLImageElement) pendingImages.add(node);
      for (const image of node.querySelectorAll?.('img') ?? []) pendingImages.add(image);
      if (pendingImages.size > 0 && !idleHandle) idleHandle = runWhenIdle(optimizeBatch);
    };

    enqueue(document.documentElement);
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) enqueue(node);
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  function showToast() {
    if (!isSafari || settings.mode === 'disabled' || !document.body) return;
    try {
      if (sessionStorage.getItem('gmos-toast-shown-v1') === '1') return;
      sessionStorage.setItem('gmos-toast-shown-v1', '1');
    } catch {
      // Safari 封鎖儲存空間時仍可正常執行，僅可能重複顯示提示。
    }
    const toast = document.createElement('div');
    toast.id = 'gmos-startup-toast';
    toast.textContent = runtime.workerCanvasFixApplied
      ? `Safari 最佳化已啟用（${MODE_LABELS[settings.mode]}・Worker Canvas 修正）`
      : `Safari 最佳化已啟用（${MODE_LABELS[settings.mode]}）`;
    document.body.append(toast);
    window.setTimeout(() => {
      toast.style.opacity = '0';
      window.setTimeout(() => toast.remove(), 220);
    }, 2200);
  }

  function collectDiagnostics() {
    let webgl = '未測試';
    try {
      const canvas = document.createElement('canvas');
      webgl = canvas.getContext('webgl2') ? 'WebGL 2' : canvas.getContext('webgl') ? 'WebGL 1' : '不可用';
    } catch {
      webgl = '偵測失敗';
    }

    return [
      `${SCRIPT_NAME} v${SCRIPT_VERSION}`,
      `瀏覽器：${isSafari ? `Safari ${safariMajor || '未知版本'}` : '非 Safari（未套用 Safari 專用修正）'}`,
      `模式：${MODE_LABELS[settings.mode]}`,
      `主執行緒繪圖：${webgl}`,
      `Worker Canvas 修正：${runtime.workerCanvasFixApplied ? '已套用' : settings.workerCanvasFix ? '無法套用或無需套用' : '關閉'}`,
      `互動加速：${settings.interactionBoost ? '開啟' : '關閉'}`,
      `減少視覺效果：${settings.reduceEffects ? '開啟' : '關閉'}`,
      `已最佳化圖片：${runtime.optimizedImages}`,
      '',
      '提示：切換模式後會重新載入 Google Maps。',
    ].join('\n');
  }

  function saveMode(nextMode) {
    if (!Object.hasOwn(PRESETS, nextMode)) return;
    if (writeStoredSettings({ mode: nextMode })) location.reload();
  }

  function registerMenuCommands() {
    if (typeof GM_registerMenuCommand !== 'function') return;

    GM_registerMenuCommand(`效能模式：${MODE_LABELS[settings.mode]}（點按切換）`, () => {
      const index = MODE_ORDER.indexOf(settings.mode);
      saveMode(MODE_ORDER[(index + 1) % MODE_ORDER.length]);
    });
    GM_registerMenuCommand('套用「平衡模式」', () => saveMode('balanced'));
    GM_registerMenuCommand('套用「最高效能」', () => saveMode('maximum'));
    GM_registerMenuCommand('套用「相容模式」', () => saveMode('compatibility'));
    GM_registerMenuCommand('停用所有最佳化', () => saveMode('disabled'));
    GM_registerMenuCommand('顯示最佳化診斷', () => window.alert(collectDiagnostics()));
  }

  function startDomOptimizations() {
    if (!isSafari) return;

    if (!document.documentElement) {
      window.addEventListener('DOMContentLoaded', startDomOptimizations, { once: true });
      return;
    }

    applyRootClasses();
    if (settings.mode !== 'disabled') addStyle(OPTIMIZER_CSS);
    if (settings.interactionBoost) installInteractionBoost();
    if (settings.optimizeImages) installImageOptimizer();

    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', showToast, { once: true });
    } else {
      showToast();
    }
  }

  // 方便在 Safari Web Inspector 的 Console 檢查目前狀態。
  Object.defineProperty(window, '__GMOS__', {
    configurable: true,
    value: Object.freeze({
      version: SCRIPT_VERSION,
      isSafari,
      safariMajor,
      settings,
      runtime,
      diagnostics: collectDiagnostics,
      setMode: saveMode,
    }),
  });

  registerMenuCommands();
  startDomOptimizations();
})();
