import { logInfo, showErrorMessage, showInfo } from "../utils/src/logger/logger";
import { TreeScriptModel, ScriptsType } from "../utils/src/vscode_feature/sidebar/sidebar_model";
import { BaseTreeDataProvider } from "../utils/src/vscode_feature/sidebar/sidebar_tree_provider";
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const vscodeScripts: TreeScriptModel[] = [
    {
        scriptsType: ScriptsType.customer,
        label: "Register Copilot Commit setting",
        script: 'setup_copilot_commit',
        itemAction: () => setupCopilotCommit()
    }
];

async function setupCopilotCommit() {
    try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            showErrorMessage('未找到工作區資料夾');
            return;
        }

        const vscodePath = path.join(workspaceFolders[0].uri.fsPath, '.vscode');
        const settingsPath = path.join(vscodePath, 'settings.json');
        const instructionsPath = path.join(vscodePath, '.copilot-commit-message-instructions.md');

        // 確保 .vscode 目錄存在
        if (!fs.existsSync(vscodePath)) {
            fs.mkdirSync(vscodePath);
        }

        // 處理 settings.json
        let settings = {};
        if (fs.existsSync(settingsPath)) {
            const content = fs.readFileSync(settingsPath, 'utf8');
            settings = JSON.parse(content || '{}');
        }

        const copilotConfig = {
            "github.copilot.chat.commitMessageGeneration.instructions": [
                {
                    "file": ".vscode/.copilot-commit-message-instructions.md"
                }
            ]
        };

        settings = { ...settings, ...copilotConfig };
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4));



        // 處理 instructions 文件
        if (fs.existsSync(instructionsPath)) {
            const existingContent = fs.readFileSync(instructionsPath, 'utf8');
            if (existingContent.trim() !== newInstructions.trim()) {
                const timestamp = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
                const separator = '\n\n---\n\n';
                fs.writeFileSync(instructionsPath, existingContent + separator + `更新時間：${timestamp}\n\n` + newInstructions);
                showInfo('Copilot Commit 指示已更新');
            } else {
                showInfo('Copilot Commit 指示無需更新');
            }
        } else {
            fs.writeFileSync(instructionsPath, newInstructions);
            showInfo('Copilot Commit 指示已創建');
        }
    } catch (error) {
        showErrorMessage(`Failed: ${error}`);
    }
}


export class VscodeDataProvider extends BaseTreeDataProvider {
    supportScripts(): TreeScriptModel[] {
        return [...vscodeScripts];
    }
}

// 定義新的 instructions 內容
const newInstructions = `# Git 提交訊息產生指示

       ## 目標
       
       根據提供的程式碼變更，產生一個符合規範、簡潔且正式的繁體中文 Git 提交訊息。
       
       ## 格式
       
       請遵循 Conventional Commits 格式：
       
       \`\`\`
       <類型>: <標題>
       
       [可選的正文]
       
       [可選的註腳]
       \`\`\`
       
       ### 1. 類型 (Type)
       
       必須是以下其中一個：
       
       | 類別         | 說明                                                         |
       | ------------ | ------------------------------------------------------------ |
       | \`✨feat\`     | 新增功能 (feature)                                           |
       | \`🐛fix\`      | 修復 bug                                                     |
       | \`🛠chore\`    | 維護、工具變更 (不影響程式碼功能，如 CI/CD、依賴更新)               |
       | \`🔄refactor\` | 重構程式碼 (不影響功能)                                           |
       | \`🎨style\`    | 格式調整 (不影響程式碼邏輯，如排版、註解)                           |
       | \`📚docs\`     | 文件更新                                                     |
       | \`✅test\`     | 測試新增或修改                                               |
       | \`🤖ci\`       | CI/CD 相關變更                                               |
       
       ### 2. 標題 (Subject)
       
       -   簡要描述變更內容。
       -   最多 50 個字元。
       -   使用祈使句、現在式 (例如：\`新增\` 而不是 \`新增了\`)。
       -   開頭的類型標籤後緊跟一個冒號和一個空格。
       -   除了開頭的表情符號外，不應包含其他特殊字元。
       
       ### 3. 正文 (Body) - 可選
       
       -   提供變更的詳細說明，解釋「為什麼」要進行此變更，而不僅僅是「做了什麼」。
       -   每行不超過 72 個字元。
       -   可以使用條列式 (\`- \`) 說明具體的檔案修改：
           -   格式：\`- $file_path: $變更說明 ($原因)\`
           -   相似的修改可以整合。
           -   相同類型的修改應放在一起。
           -   非重要的修改可以整合。
       -   與標題之間需空一行。
       
       ### 4. 註腳 (Footer) - 可選
       
       -   用於標示重大變更 (Breaking Changes) 或關聯的議題 (Issue)。
       -   例如：\`BREAKING CHANGE: ...\` 或 \`Refs: #123\`
       -   與正文之間需空一行。
       
       ## 要求
       
       -   **語言：** 必須使用繁體中文。
       -   **簡潔：** 避免冗餘的詞語。
       -   **清晰：** 清楚說明變更的檔案、內容、目的和影響。
       -   **整合：** 將相關或次要的變更適當整合。
       -   **重新整理：** 如果訊息過長，請重新整理並聚焦於最重要的變更。`;