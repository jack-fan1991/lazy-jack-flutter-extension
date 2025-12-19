---
description: 更新 CHANGELOG 並提交
---

這個工作流程會協助你更新 CHANGELOG.md 並處理 Git commit。

## 使用方式

當你呼叫這個工作流程時,我會:
1. 檢查當前的改動
2. 提交改動到 Git (使用英文 commit message)
3. 生成英文的 CHANGELOG 條目
4. 更新 CHANGELOG.md
5. 提交 CHANGELOG 更新
6. **通知你完成**

你需要自己處理:
- 更新 package.json 版本號
- 執行 `npm run build`
- 執行 `vsce publish`
- 推送到遠端: `git push origin main`
- 建立 Git tag (可選)

---

## CHANGELOG 格式規範

### 版本號規則
- **Bugfix**: 增加最後一位數字 (0.0.215 → 0.0.216)
- **Feature**: 增加中間數字 (0.0.215 → 0.1.0)
- **Breaking Change**: 增加第一位數字 (0.0.215 → 1.0.0)

### CHANGELOG 類別標籤
- ✨ **Features** - 新功能
- 🐛 **Bugfix** - 錯誤修正
- ♻️ **Refactor** - 重構
- 📝 **Documentation** - 文件更新
- 🔧 **Chore** - 雜項/維護
- ⚡ **Performance** - 效能優化
- 🎨 **Style** - 程式碼風格調整

### 範例格式 (請使用英文)

```markdown
# 0.0.216
## 🐛 Bugfix
- **Component Name**: Brief description
  - Detail 1
  - Detail 2
  - Impact or related files

# 0.0.215
(之前的版本記錄...)
```

---

## 參考資訊

### 當前版本
```bash
cat package.json | grep '"version"'
```

### Marketplace 連結
https://marketplace.visualstudio.com/items?itemName=jackFan.lazy-jack

### 發布命令 (自行執行)
```bash
# 1. 更新版本號 (手動編輯 package.json)
# 2. 編譯
npm run build

# 3. 發布
vsce publish

# 4. 推送到遠端
git push origin main

# 5. 建立 tag (可選)
git tag vx.x.x
git push origin vx.x.x
```
