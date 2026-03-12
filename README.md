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
