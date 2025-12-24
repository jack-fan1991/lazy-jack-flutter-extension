# SVG/PNG Assets Generator 測試情境

這個資料夾包含各種測試情境，用來驗證 Asset Transformer 的功能。

## 📂 測試情境結構

```
test/svg_test_sample/
├── assets/
│   ├── svg/
│   │   ├── home/
│   │   │   ├── card.svg           ✅ 正常命名
│   │   │   ├── banner.svg         ✅ 正常命名
│   │   │   ├── home_card.svg      ⚠️ 命名衝突！與 card.svg 會產生相同的 enum 名稱
│   │   │   └── logo.png           ✅ 混用測試（SVG 資料夾中有 PNG）
│   │   └── profile/
│   │       └── avatar.svg         ✅ 正常命名
│   ├── icons/
│   │   ├── user.svg               ✅ 正常命名
│   │   ├── settings.svg           ✅ 正常命名
│   │   └── user.png               ⚠️ 命名衝突！與 user.svg 同名但不同副檔名
│   └── images/
│       └── logos/
│           ├── dark.png           ✅ 正常命名
│           └── light.png          ✅ 正常命名
├── back.svg                       📦 範本檔案
└── no_notifications_yet.png       📦 範本檔案
```

## 🧪 測試案例

### 1️⃣ **正常情況測試**
**操作：** 在 `assets/svg/profile/` 右鍵執行
**預期結果：**
- 生成 `lib/assets/svg_profile_svg.lazy.dart`
- 包含 `avatar` enum 成員

---

### 2️⃣ **命名衝突測試（同類型）**
**操作：** 在 `assets/svg/home/` 右鍵執行
**預期結果：**
- ⚠️ 偵測到衝突：`homeCard` 對應到兩個檔案
  - `assets/svg/home/card.svg`
  - `assets/svg/home/home_card.svg`
- 顯示 QuickPick 讓使用者選擇要重命名的檔案
- 選擇後自動開啟檔案總管並觸發重命名

---

### 3️⃣ **命名衝突測試（跨類型）**
**操作：** 在 `assets/icons/` 右鍵執行
**可能發生：**
- ⚠️ 偵測到 SVG 衝突：無
- ⚠️ 偵測到 PNG 衝突：無
- 但會產生兩個檔案：
  - `icons_svg.lazy.dart` → `SvgAssets.user`, `SvgAssets.settings`
  - `icons_png.lazy.dart` → `PngAssets.user`
- enum 名稱不衝突（因為在不同 enum 中）

---

### 4️⃣ **混用檔案測試**
**操作：** 在 `assets/svg/home/` 右鍵執行
**預期結果：**
- 分別生成兩個檔案：
  - `svg_home_svg.lazy.dart` → 包含 `card`, `banner`, `homeCard`
  - `svg_home_png.lazy.dart` → 包含 `logo`
- ✅ 允許同資料夾混用

---

### 5️⃣ **深層路徑測試**
**操作：** 在 `assets/images/logos/` 右鍵執行
**預期結果：**
- 生成 `lib/assets/images_logos_png.lazy.dart`
- enum 命名：`dark`, `light`（移除了路徑前綴）

---

### 6️⃣ **整個 assets 資料夾測試**
**操作：** 在 `assets/` 右鍵執行
**預期結果：**
- 掃描所有子資料夾
- 產生：
  - `assets_svg.lazy.dart` → 所有 SVG 檔案
  - `assets_png.lazy.dart` → 所有 PNG 檔案
- ⚠️ 可能會有多個命名衝突

---

## 📋 驗證清單

- [ ] 路徑分類命名正確
- [ ] 命名衝突檢測生效
- [ ] QuickPick 顯示正確
- [ ] 自動開啟重命名功能
- [ ] 混用檔案正常處理
- [ ] 檔案命名符合規則（移除 assets 前綴）
- [ ] 生成的 Dart 程式碼格式正確
- [ ] 警告訊息顯示友善

---

## 🔧 如何重置測試環境

```bash
# 刪除生成的檔案
rm -rf lib/assets/*_svg.lazy.dart lib/assets/*_png.lazy.dart

# 重新建立測試檔案（如果需要）
# 執行上面的 cp 指令
```

---

## 💡 修正命名衝突的方法

### 方案 1：重命名檔案
```
home_card.svg → home_card_outline.svg
```

### 方案 2：調整資料夾結構
```
svg/home/card.svg
svg/home/outlined/card.svg  → outlinedCard
```

### 方案 3：加上更多描述
```
home_card.svg → home_card_primary.svg
```
