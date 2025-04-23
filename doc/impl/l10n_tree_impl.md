# Flutter l10n 功能實作記錄

* Feature : 
  - FLUTTER STRINGS:
    - 顯示未被定義為多國語系的字串
    - 僅支援簡單分類標籤 ['log' | 'fix' | 'print' | 'other']
    - 顯示在側邊欄,支援列表標籤過濾
    ![](../image/l10n/tree_view.png)
    - 點擊後自動跳轉文字位置,如果是 fix 則可以 使用修正
    ![](../image/l10n/l10n_fix.png)

## package.json

*   **目標**:
    *   宣告新的樹狀檢視 (`Tree View`)。
    *   宣告用於篩選檢視的指令 (`Command`)。
    *   設定檢視標題列的選單項目 (`Menu`) 以觸發 Filter指令。
    *   更新擴充功能版本號。
*   **更新了**:
    *   在 `contributes.views.explorer` 下新增了 `dartL10nFixView` 的定義，設定其 `id` 和 `name` ("Flutter Strings")。
    *   在 `contributes.commands` 下新增了 `dartL10n.showTagFilter` 指令的定義，設定其 `command` 和 `title` ("Filter tag")。
    *   在 `contributes.menus.view/title` 下新增了一個選單項目，設定其 `command` 為 `dartL10n.showTagFilter`，`when` 條件為 `view == dartL10nFixView`，並指定 `group` 為 `navigation`。
    *   將 `version` 欄位的值增加。

## src/vscode_code_len_provider/l10n/dart_i10n_fix_listener.ts

*   **目標**:
    *   實作樹狀檢視的資料模型 (`UntranslatedStringItem`)。
    *   實作樹狀檢視的資料提供者 (`DartL10nStringFixProvider`)，包含資料載入、排序、篩選和重新整理邏輯。
    *   實作檔案監聽器 (`DartI18nListener`)，用於偵測活動編輯器變更和文件儲存事件。
    *   實作字串偵測、分類和提取邏輯 (`handleFile`)。
    *   註冊樹狀檢視、監聽器和篩選指令 (`registerDartL10nStringTreeProvider`)。
*   **更新了**:
    *   建立了 `UntranslatedStringItem` 類別，定義了顯示標籤、範圍、URI 和分類標籤 (`tag`)，並設定了點擊開啟文件的 `command`。
    *   建立了 `DartL10nStringFixProvider` 類別，實作了 `vscode.TreeDataProvider` 介面，包含 `getTreeItem`, `getChildren`, `refresh`, `setFilter` 方法和 `_onDidChangeTreeData` 事件。
    *   建立了 `DartI18nListener` 類別，繼承自 `FileListenerBase`，實作了 `onDidChangeActiveTextEditor` 和 `onDidSaveTextDocument` 方法來觸發 `handleFile`。
    *   在 `handleFile` 方法中：
        *   使用正規表示式尋找字串。
        *   加入了忽略 `import`/`part`/空行/空字串的邏輯。
        *   加入了根據上下文 (log, print, Key, fix) 判斷 `tag` 的邏輯。
        *   呼叫 `isTranslated` (目前恆為 false) 判斷是否需要加入列表。
        *   建立 `UntranslatedStringItem` 實例並加入 `items` 陣列。
        *   呼叫 `provider.refresh(items)` 更新檢視。
    *   建立了 `registerDartL10nStringTreeProvider` 函式：
        *   建立 Provider 和 Listener 實例。
        *   呼叫 `vscode.window.registerTreeDataProvider` 註冊檢視。
        *   將 Listener 的事件處理函式加入 `context.subscriptions`。
        *   呼叫 `vscode.commands.registerCommand` 註冊 `dartL10n.showTagFilter` 指令，內部使用 `showQuickPick` 並呼叫 `provider.setFilter`。

## src/vscode_code_len_provider/l10n/flutter_l10n_fix.ts

*   **目標**:
    *   實作 CodeLens 提供者 (`DartI18nCodeLensProvider`)，在未翻譯的字串上方顯示快速修復提示。
    *   註冊 CodeLens 提供者 (`registerDartL10nStringFix`)。
*   **更新了**:
    *   建立了 `DartI18nCodeLensProvider` 類別，實作了 `vscode.CodeLensProvider` 介面。
    *   在 `provideCodeLenses` 方法中：
        *   使用正規表示式尋找字串。
        *   加入了忽略 `import`/`part`/`Key()` 字串的邏輯。
        *   呼叫 `isTranslated` (檢查 `.l10n`) 判斷是否需要顯示 CodeLens。
        *   建立 `vscode.CodeLens` 實例，設定包含字串預覽的 `title` 和對應的修復 `command` 及 `arguments`。
    *   建立了 `registerDartL10nStringFix` 函式，呼叫 `vscode.languages.registerCodeLensProvider` 進行註冊。

## src/extension.ts

*   **目標**:
    *   在擴充功能啟用時，整合並執行新功能的註冊邏輯。
*   **更新了**:
    *   匯入了 `registerDartL10nStringTreeProvider` 和 `registerDartL10nStringFix`。
    *   在 `activate` 函式中，呼叫了這兩個註冊函式，並傳遞 `context`。

