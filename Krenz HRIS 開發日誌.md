# Krenz HRIS 開發日誌

> 最後更新：2026-03-13

## 專案資訊

| 項目 | 內容 |
|------|------|
| 專案名稱 | Krenz 企業內網 (HRIS) |
| 技術堆疊 | React 18 + Vite 5, Tailwind CSS, Firebase Auth & Firestore, Lucide React |
| 部署方式 | GitHub Pages via GitHub Actions |
| 版控 | Git → `lupylamce/krenz-org-chart` (main branch) |

---

## 系統架構

### 雙層金庫資料庫

| 層級 | Firestore Path | 權限 |
|------|----------------|------|
| Public | `/artifacts/{appId}/public/data/orgData/org_v2` | 所有人可讀，Admin 可寫 |
| Private | `/artifacts/{appId}/private/data/hrData/roster` | 僅 Admin (HR 信箱綁定) 可讀寫 |

### 模組化目錄結構 (S.O.L.I.D.)

```
src/
├── components/
│   ├── OrgTree/        # 組織架構圖 (OrgMap.jsx)
│   ├── Dashboard/      # 員工儀表板 + 考勤月曆 (Dashboard.jsx, AttendanceCalendar.jsx)
│   ├── WarRoom/        # HR 戰情室 (WarRoom.jsx)
│   ├── Forms/          # 後台表單 (BackendList.jsx, BackendModal.jsx)
│   └── common/         # 共用元件 (InputField.jsx)
├── hooks/              # useAuth, useOrgData, useAttendance
├── services/           # firebase.js
├── utils/              # dateHelpers.js, attendance.js (純函數)
└── styles/             # tree.css (全域樣式)
```

---

## 開發迭代紀錄

### Phase 1 ~ 3.5：核心功能建置

- 組織架構圖渲染與互動式拖曳
- 雙層金庫 (Public/Private) 與 RBAC 權限控管
- 動態考勤引擎：遲到 / 早退 / 緩衝分鐘計算
- 假勤雙層簽核流程：員工申請 → 主管核准 → HR 歸檔

---

### Phase 4：系統重構與部署轉移

| 項目 | 狀態 | 說明 |
|------|------|------|
| S.O.L.I.D 模組化 | ✅ | 拆解 2000 行 `App.jsx` 為獨立元件、Hook、Service |
| GitHub Actions 部署 | ✅ | 建立 `.github/workflows/deploy.yml`，自動 build + deploy 至 GitHub Pages |
| `.gitignore` | ✅ | 排除 `node_modules/`, `dist/`, `.env`, `*.log`, `.tmp` |

---

### 2026-03-12 Session 1：首次除錯

| Bug | 檔案 | 修法 |
|-----|------|------|
| 幕僚單位偏移 | `OrgMap.jsx` | 改用 `flex-1` 均分容器空間對齊中央鉛垂線 |
| 編輯模式無法進後台 | `App.jsx` | 修正 `setIsFormOpen` 狀態對應，確保按鈕切換到花名冊 |
| 日期年份可超過 4 位 | 全系統 `<input type="date">` | 加上 `max="9999-12-31"` 屬性 |

---

### 2026-03-12 Session 2：深度除錯

#### 1. 組織圖 T 字排版二次修正 (`OrgMap.jsx`)

**問題**：`flex-1` 在右側幕僚寬度不對稱時仍會把父節點推偏。

**解法**：改用 CSS Grid `grid-cols-[1fr_auto_1fr]`，強制左右 `1fr` 等寬，中間 T 字線絕對置中。

#### 2. 後臺入口遺失修復 (`BackendList.jsx`)

**問題**：重構時遺漏了花名冊總表元件，HR 點「進入資料庫後臺」後無畫面。

**解法**：重寫 `BackendList.jsx`，提供搜尋、新增，以及串接 `BackendModal.jsx` 編輯單筆資料的完整流程。

---

### 2026-03-12 Session 3：UI 修復 + 考勤防呆 + 考勤月曆開發

#### 1. T 字排版三次修正 (`OrgMap.jsx`)

**問題**：Grid 的 `1fr_auto_1fr` 在某些情況下仍有 sub-pixel 偏移，且旁邊有多餘的「幕僚單位」直書小字。

**解法**：
- 改用 `grid-cols-2` + 絕對定位中線 (`absolute left-1/2 -translate-x-1/2 w-[2px]`)，確保像素級精準對齊。
- 移除「幕僚單位」直書文字標籤。

#### 2. BackendList 無法捲動 (`BackendList.jsx`)

**問題**：外層 `overflow-hidden` 鎖死使長名單無法滾動。

**解法**：調整容器為 `flex-1 overflow-y-auto min-h-0`。

#### 3. Sidebar 導覽未清理疊加層 (`App.jsx`)

**問題**：切換頁面時 BackendList Modal 仍殘留。

**解法**：每個 Sidebar 按鈕的 `onClick` 統一追加 `setShowBackend(false)`。

#### 4. 請假漏打卡防呆 (`Dashboard.jsx`)

**新增**：員工處於請假期間但上午未打卡時，系統顯示紅色脈衝警告，引導填寫補打卡單。

#### 5. 考勤月曆開發 (`AttendanceCalendar.jsx`) 🆕

| 功能 | 說明 |
|------|------|
| 月曆網格 | 動態渲染當月日期，前後月灰顯補位 |
| 狀態色碼 | 🟢 正常 / 🔴 異常缺勤 / 🔵 請假 / 🟡 審核中 |
| 月度統計 | 出勤天數、請假天數、遲到早退次數、異常缺勤次數 |
| 員工端入口 | Dashboard「近期考勤」旁新增「完整日曆」按鈕 |
| HR 端入口 | WarRoom 表格操作欄新增月曆圖示按鈕，點擊開啟全螢幕月曆 |
| 快捷補卡 | 員工點擊異常日期 → 自動帶入日期並開啟補打卡表單 |

---

## Session 4：考勤進化版 (2026-03-13)

### 批次 A：快速修復

| # | Bug / 需求 | 檔案 | 修法 |
|---|-----------|------|------|
| A1 | 簽核後詳情面板不關閉 | `WarRoom.jsx` | 每個審核按鈕 `onClick` 追加 `setSelectedAppDetail(null)` |
| A2 | 補打卡可申請未來時間 | `App.jsx` | `handleSubmitApplication` 增加 `punchMs > Date.now()` 校驗 |
| A3 | 時間輸入不夠智能 | `Dashboard.jsx` | 假單改 30 分鐘粒度 `<select>`；補卡保留 `<input type="time">` + 預填表定上下班時間 |

### 批次 B：日曆顯示增強

| # | Bug / 需求 | 檔案 | 修法 |
|---|-----------|------|------|
| B1 | 補卡核准後日曆仍缺勤 | `AttendanceCalendar.jsx` | 修正 `attendanceLogs[employee.id]` 取值路徑 |
| B2 | 日曆格缺乏打卡時間與狀態 | `AttendanceCalendar.jsx` | 每格永遠顯示 `punchIn→punchOut`，多重 Tag（遲到 N 分/早退 N 分/正常/上班中） |
| B3 | 部分工時假不驗證出勤 | `AttendanceCalendar.jsx` | 改用疊加判定（假+出勤共存），依覆蓋工時比例判斷全天假/部分假，部分假無打卡標缺勤 |

### 批次 C：假別庫存扣抵

| # | 需求 | 檔案 | 修法 |
|---|------|------|------|
| C1 | 假別政策資料結構 | `App.jsx` | 新增 `LEAVE_POLICY` 常量（7 假別 × `unit/minUnit/note`），全部預設 `enabled: false` |
| C2 | 後台假別管理 UI | `BackendModal.jsx` | 新增「🗓️ 假別配額」分頁，每假別可啟停 + 設定配額 + 顯示已用/剩餘 |
| C3 | 請假扣抵校驗 | `App.jsx` | `handleApproveApplication` 核准後依時數自動扣抵 `leaveQuota.used` |

### 批次 D：加班補休串聯

| # | 需求 | 檔案 | 修法 |
|---|------|------|------|
| D1 | 加班申請表單 | `Dashboard.jsx` | 申請中心新增加班按鈕 + 加班日期/起止時間表單 + 歷史列表支援 |
| D2 | 加班核准 → 驗證 → 產生調休 | `App.jsx` | 驗證申請時段 ≤ 打卡範圍，通過後以 30 分鐘為最小單位計算補休，寫入 `leaveQuota.調休.entries[]`（含到期日 +6 個月） |
| D3 | 補休扣抵與到期管理 | `App.jsx` | 到期前 30 天提醒 HR，到期後標記「已到期待處理」，HR 可延後 6 個月或確認作廢 |

---

## 待辦事項

- [ ] Unit Testing 環境建構
- [ ] 跨日打卡 / 忘記下班打卡防呆
- [ ] 請假與補卡時段重疊衝突校驗
- [x] ~~假別庫存 (特休 / 補休) 扣抵機制~~ (Session 4 完成)
- [ ] 調休到期通知與 HR 延後/作廢 UI（已設計，待前端介面）
- [ ] README.md 完善