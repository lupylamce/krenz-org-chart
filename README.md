# Krenz HRIS (人力資源資訊系統)

這是一個具備防呆機制、權限控管、雙層機密資料庫、自動化考勤打卡，以及雙層簽核假勤的全公司協作內網系統。

## 🎯 核心功能
* **身分驗證**：支援電子郵件密碼、Google 快速登入及訪客瀏覽模式。
* **權限控管 (RBAC)**：支援 一般員工、HR 管理員、以及 God Mode (超級管理員) 切換。
* **雙層金庫資料庫設計**：
  * **Public Data**：公司公開架構、一般員工卡片（無機密訊息），所有登入人員皆可讀取，僅主管與 HR 可編輯。
  * **Private Data**：身分證字號、薪資卡號、合約年資等極機密檔案，僅限綁定的 HR Admin 身分讀取。
* **打卡與考勤戰情室**：每日即時更新員工上下班打卡時間，並根據設定的「表定上班時間」與「彈性緩衝分鐘」動態計算是否遲到及應下班時間。
* **請假與簽核中心 (War Room)**：主管核准、HR 覆核雙層機制。
* **動態組織架構圖 (OrgMap)**：支援無限畫布、滾輪縮放與拖曳，可直接在組織圖上拖拉員工或部門進行調動。

## 最新更新紀錄 (Latest Updates)

### 2026-03-12 (Session 2)
- **視覺結構完善 (Visual Layout Fixes)**：重構組織架構圖渲染邏輯 (使用 CSS Grid: `grid-cols-[1fr_auto_1fr]`)，確保幕僚分支 (Staff Units) 於 T 字形狀正確地絕對置中，無須妥協側邊發展而導致結構錯位。
- **管理者後臺全面恢復 (Admin Backend Restored)**：還原了因元件抽離過程遺失的「資料庫後臺 (BackendList)」總覽列表。現在具備 HR 權限或上帝模式帳號切換編輯模式後點擊「進入資料庫後臺」，可檢視完整員工名冊、部門組織清單，並配有文字搜尋功能，點擊編輯即彈出修改對話窗。
- **日期資料型態防呆強化 (Strict Date Sanitization)**：全系統 `<input type="date">` 已嚴格約束年份最大值為四位數字 (`max="9999-12-31"`)，防堵長年份錯誤。

### 2026-03-12 (Session 1)
- **組織圖拖曳調動 (OrgMap Drag & Drop)**：支援在組織圖上直接拖曳員工或部門進行調動，並即時更新資料庫。
- **組織圖無限畫布 (OrgMap Infinite Canvas)**：支援無限畫布、滾輪縮放與拖曳，提供更流暢的組織圖瀏覽體驗。
- **組織圖部門新增/編輯/刪除 (OrgMap Department CRUD)**：支援部門的新增、編輯與刪除功能，並即時更新資料庫。
- **組織圖員工新增/編輯/刪除 (OrgMap Employee CRUD)**：支援員工的新增、編輯與刪除功能，並即時更新資料庫。
- **組織圖員工卡片 (OrgMap Employee Card)**：員工卡片顯示員工基本資料、職稱、部門、直屬主管等資訊。
- **組織圖員工搜尋 (OrgMap Employee Search)**：支援員工搜尋功能，可快速定位員工在組織圖上的位置。
- **組織圖員工篩選 (OrgMap Employee Filter)**：支援員工篩選功能，可依部門、職稱等條件篩選員工。
- **組織圖員工排序 (OrgMap Employee Sort)**：支援員工排序功能，可依姓名、職稱等條件排序員工。
- **組織圖員工匯出 (OrgMap Employee Export)**：支援員工資料匯出功能，可匯出為 Excel 或 CSV 格式。
- **組織圖員工匯入 (OrgMap Employee Import)**：支援員工資料匯入功能，可從 Excel 或 CSV 格式匯入員工資料。

## 🛠️ 技術堆疊
* **Frontend**: React 18, Vite, Tailwind CSS, Lucide React (Icons)
* **Backend / Database**: Firebase (Auth & Firestore)
* **Deployment**: GitHub Pages (自動化 Actions 部署)

## 📦 本地快速啟動

1. 克隆此專案後，安裝相依套件：
   ```bash
   npm install
   ```
2. 啟動本機測試伺服器：
   ```bash
   npm run dev
   ```
3. 如需編譯生產版本：
   ```bash
   npm run build
   ```

## 🚀 部署方式
專案已設定 GitHub Actions。您只需將代碼推送 (Push) 到 GitHub 的 `main` 分支，腳本便會自動建置並部署到 `gh-pages` 分支提供靜態網頁服務！

---
*文件更新時間：即時自動更新*
