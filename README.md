[繁體中文](https://github.com/TW527E/Google-Maps-Optimizer-for-Safari/blob/main/README.md) | [English](https://github.com/TW527E/Google-Maps-Optimizer-for-Safari/blob/main/README.en.md)

# Google Maps Safari 流暢度最佳化

一個專為 Safari 與 Tampermonkey 製作的使用者腳本，用來改善網頁版 Google Maps 的縮放、拖曳和介面反應速度。

腳本針對 Safari 26 與 27 的 Worker WebGL／OffscreenCanvas 卡頓路徑提供自動後備處理，並在使用者操作地圖時暫時降低不必要的介面繪製成本。

## 快速安裝

**[前往 Greasy Fork 安裝腳本](https://greasyfork.org/zh-TW/scripts/589350-google-maps-safari-流暢度最佳化)**

## 功能

- 在 Safari 26／27 的平衡模式中，自動停用 Worker OffscreenCanvas 路徑，讓 Google Maps 改用主執行緒 Canvas／WebGL 後備渲染器。
- 拖曳、滾輪縮放、觸控和鍵盤操作期間，暫時縮短介面動畫與轉場。
- 減少透明模糊、陰影和彈性捲動造成的額外合成負擔。
- 在瀏覽器閒置時為圖片設定非同步解碼，避免阻塞主要操作。
- 最高效能模式會進一步延遲載入大型 Google 地點照片並減少介面動畫。
- 僅在 Safari 啟用最佳化；在其他瀏覽器上不修改 Google Maps。
- 不收集資料、不加入追蹤，也不發出額外網路請求。

## 系統需求

- macOS
- Safari
- Tampermonkey for Safari
- 網頁版 Google Maps

建議使用最新版 Safari。Worker Canvas 修正預設只會在 Safari 26 與 27 自動啟用。

## 安裝

1. 在 Safari 安裝並啟用 [Tampermonkey](https://www.tampermonkey.net/)。
2. 前往 [Greasy Fork 腳本頁面](https://greasyfork.org/zh-TW/scripts/589350-google-maps-safari-流暢度最佳化)。
3. 選擇安裝腳本，並在 Tampermonkey 確認安裝。
4. 重新載入 [Google Maps](https://www.google.com/maps)。

也可以在 Tampermonkey 控制台建立新的使用者腳本，手動貼入 [`google-maps-safari-optimizer.user.js`](https://github.com/TW527E/Google-Maps-Optimizer-for-Safari/blob/main/google-maps-safari-optimizer.user.js) 的完整內容。

## 效能模式

可以從 Tampermonkey 的腳本選單切換模式；切換後 Google Maps 會自動重新載入。

| 模式 | Worker Canvas 修正 | 互動加速 | 圖片最佳化 | 動畫降低 |
|---|---:|---:|---:|---:|
| 平衡模式（預設） | Safari 26／27 | 是 | 非同步解碼 | 互動時 |
| 最高效能 | 強制啟用 | 是 | 非同步解碼及大型照片延遲載入 | 是 |
| 相容模式 | 否 | 否 | 否 | 否 |
| 停用 | 否 | 否 | 否 | 否 |

如果地圖在平衡模式下無法正確顯示，請切換到「相容模式」。若使用其他 Safari 版本仍有明顯卡頓，可以嘗試「最高效能」。

## 診斷

在 Tampermonkey 的腳本選單選擇「顯示最佳化診斷」，可以查看：

- Safari 版本
- 目前模式
- WebGL 可用狀態
- Worker Canvas 修正是否成功套用
- 已最佳化的圖片數量

也可以在 Safari Web Inspector Console 執行：

```js
__GMOS__.diagnostics()
```

## 運作方式

腳本使用 `@run-at document-start` 與 Tampermonkey `@sandbox raw`，在 Google Maps 選擇渲染器前執行。

在受影響的 Safari 版本中，腳本會讓頁面層級的 `OffscreenCanvas` 與 `transferControlToOffscreen()` 功能偵測失敗，使 Google Maps 選用一般 Canvas／WebGL 後備路徑；它不會停用主執行緒 WebGL。

其他最佳化只調整 Google Maps 的介面效果與圖片解碼提示，不會修改搜尋結果、路線、帳號資料或地圖內容。

## 限制

使用者腳本無法把 Safari 的 WebKit 引擎替換成 Chrome 的 Chromium 引擎，因此無法保證兩個瀏覽器在所有硬體和 Safari 版本上擁有完全相同的效能。此腳本主要處理目前可從網頁層改善的渲染與介面負擔。

## 檔案

- [`google-maps-safari-optimizer.user.js`](https://github.com/TW527E/Google-Maps-Optimizer-for-Safari/blob/main/google-maps-safari-optimizer.user.js) — Tampermonkey 使用者腳本
- [`README.md`](https://github.com/TW527E/Google-Maps-Optimizer-for-Safari/blob/main/README.md) — 繁體中文說明
- [`README.en.md`](https://github.com/TW527E/Google-Maps-Optimizer-for-Safari/blob/main/README.en.md) — English documentation
- [`LICENSE`](https://github.com/TW527E/Google-Maps-Optimizer-for-Safari/blob/main/LICENSE) — MIT License

## 授權

本專案採用 [MIT License](https://github.com/TW527E/Google-Maps-Optimizer-for-Safari/blob/main/LICENSE)。
