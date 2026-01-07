# RC-505 Loop Station Simulator

一個基於 React + TypeScript + Vite 的 BOSS RC-505 Loop Station 網頁模擬器。

## 功能特色

- 🎵 **多軌道錄音與播放** - 支援最多 5 個軌道同時錄製和播放
- 🎛️ **音量控制推桿** - 每個軌道獨立的音量控制
- 🎚️ **效果器控制** - Input FX 和 Track FX 效果器
- 💾 **記憶體銀行系統** - 支援多個記憶體槽位（1-99）
- 🎶 **預設音樂包** - 內建 Lo-Fi、Cyberpunk、House 音樂包
- 🎹 **節拍器** - 內建節拍器功能
- 📱 **響應式設計** - 現代化的 UI 設計

## 技術棧

- **React 19** - UI 框架
- **TypeScript** - 類型安全
- **Vite** - 建置工具
- **Tailwind CSS** - 樣式框架
- **Web Audio API** - 音訊處理

## 安裝與執行

### 前置需求

- Node.js (建議 18+ 版本)
- npm 或 yarn

### 安裝步驟

1. 安裝依賴套件：
```bash
npm install
```

2. 啟動開發伺服器：
```bash
npm run dev
```

3. 在瀏覽器中打開 `http://localhost:3000`

### 建置生產版本

```bash
npm run build
```

建置完成後，檔案會輸出到 `dist` 資料夾。

## 專案結構

```
LOOP STATION/
├── components/          # React 元件
│   ├── ControlKnob.tsx      # 控制旋鈕
│   ├── OnboardingTutorial.tsx  # 教學導覽
│   ├── TrackChannel.tsx     # 軌道頻道
│   └── VerticalFader.tsx   # 垂直推桿
├── public/              # 靜態資源
│   └── audio/          # 音樂檔案
│       ├── lofi/       # Lo-Fi 音樂包
│       ├── cyberpunk/  # Cyberpunk 音樂包
│       └── house/       # House 音樂包
├── App.tsx              # 主應用程式
├── types.ts             # TypeScript 類型定義
├── vite.config.ts       # Vite 配置
└── package.json         # 專案配置
```

## 使用說明

### 錄音功能

1. 點擊軌道中央的圓形按鈕開始錄音
2. 再次點擊停止錄音並自動開始播放
3. 點擊左側的停止按鈕可以暫停/繼續播放

### 載入音樂包

1. 點擊 LCD 螢幕右上角的 **LOAD** 按鈕
2. 選擇一個音樂包（Lo-Fi Chill、Cyberpunk Night、House Groove）
3. 音樂會自動載入到對應的軌道並開始播放

### 記憶體銀行

- 使用右上角的 MEMORY 旋鈕切換記憶體槽位（1-99）
- 每個槽位會自動儲存當前的軌道配置
- 切換槽位時會自動載入該槽位的設定

### 效果器

- **Input FX**：輸入效果器（A、B、C）
- **Track FX**：軌道效果器（A、B、C）
- 點擊對應的按鈕開啟/關閉效果

## 音樂檔案

將您的 MP3 音樂檔案放置在 `public/audio/` 對應的資料夾中：

- `public/audio/lofi/` - Lo-Fi 音樂檔案
- `public/audio/cyberpunk/` - Cyberpunk 音樂檔案
- `public/audio/house/` - House 音樂檔案

## 授權

此專案僅供學習和個人使用。

## 貢獻

歡迎提交 Issue 或 Pull Request！
