import { onGit } from "../utils/src/language_utils/language_utils";
import { runCommand, runTerminal } from "../utils/src/terminal_utils/terminal_utils";
import { ScriptsType, SideBarEntryItem, TreeScriptModel } from "../utils/src/vscode_feature/sidebar/sidebar_model";
import { BaseTreeDataProvider } from "../utils/src/vscode_feature/sidebar/sidebar_tree_provider";
import * as vscode from 'vscode';
import { createBranch, createCheckout, createMergeNoFFInput, createReflogOptionsInput } from "./git_sidebar_action";
import { getRootPath } from "../utils/src/vscode_utils/vscode_env_utils";
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec, execSync } from "child_process";
import { gitDataProvider, sidebarManger } from "../extension";
import { logError } from "../utils/src/logger/logger";

const gitScripts: TreeScriptModel[] = [

    {
        scriptsType: ScriptsType.terminal,
        label: "git force push",
        script: 'git push -f origin',
    },
    {
        scriptsType: ScriptsType.customer,
        label: "git reflog",
        script: 'git reflog',
        itemAction: () => createReflogOptionsInput('git reflog')
    },
    // {
    //     scriptsType: ScriptsType.customer,
    //     label: "git merge --no-ff",
    //     script: 'git merge',
    //     itemAction: ()=>  createMergeNoFFInput('git merge')
    // },
    {
        scriptsType: ScriptsType.customer,
        label: "git checkout",
        script: 'git checkout',
        itemAction: () => createCheckout('git checkout')
    },
    {
        scriptsType: ScriptsType.customer,
        label: "git create branch",
        script: 'git create branch',
        itemAction: () => createBranch('git create branch')
    },
    {
        scriptsType: ScriptsType.customer,
        label: "git status",
        script: 'git status',
        itemAction: () => runTerminal(
            `git status`
        )
    },
    {
        scriptsType: ScriptsType.customer,
        label: "git init remote",
        script: "",
        itemAction: () => gitInitAndPush(
        ),
    }
    // ,
    // {
    //     scriptsType: ScriptsType.customer,
    //     label: "git tree",
    //     script: 'git tree',
    //     itemAction: ()=>   runTerminal(
    //         `git log --graph --pretty=oneline --abbrev-commit`
    //     )
    // }
]


export class GitDataProvider extends BaseTreeDataProvider {


    supportScripts(): TreeScriptModel[] {
        const userHome = process.env.HOME || process.env.USERPROFILE;
        const aiGitScriptPath = `${userHome}/.ai_git_script`;
        const devAiGitScriptPath = `${userHome}/jackgit/ai_git_script`;
        const fs = require('fs')

        if (fs.existsSync(aiGitScriptPath) || fs.existsSync(devAiGitScriptPath)) {
            gitScripts.push({
                scriptsType: ScriptsType.customer,
                label: "Ai commit",
                script: 'Ai commit',
                itemAction: () => {
                    const newTerminal = vscode.window.createTerminal('AI Commit');
                    newTerminal.sendText('aiCommit')

                }
            });
        }
        // return gitScripts
        let hasRemote = checkGitRepoWithRemote()
        let script = gitScripts
        if (!hasRemote) {
            script = script.filter((script) => { return script.label == "git init remote" })
        }
        if (hasRemote) {
            script = script.filter((script) => { return script.label != "git init remote" })
        }
        return [...script];

    }
    getChildren(element?: SideBarEntryItem): vscode.ProviderResult<SideBarEntryItem[]> {
        isGitRepo()
        return Promise.resolve(super.getChildren());
    }

}

/**
 * 檢查當前目錄是否為 Git 倉庫，且已與 remote 連接
 * @param directory 預設為 process.cwd()
 * @returns true 表示是 Git repo 且有 remote，false 表示不是或沒有 remote
 */
export function checkGitRepoWithRemote(): boolean {
    const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!rootPath) {

        return false;
    }
    const gitConfig = path.join(rootPath, '.git/config');
    if (!fs.existsSync(gitConfig)) {
        return false;
    }
    let content = fs.readFileSync(gitConfig, 'utf-8');
    return content.includes("[remote")
   
}



export function isGitRepo(): boolean {
    const rootPath = getRootPath();
    if (!rootPath) return false;
    const gitPath = path.join(rootPath, '.git');
    return fs.existsSync(gitPath);
}


/// 1.執行git init
/// 2. 執行git add .
/// 3.執行git commit
/// 4.檢查使用者有沒有安裝  gh cli
/// 5.如果沒有彈出提醒詢問安裝 
/// 6.請使用者輸入專案名稱設為workspace name
/// 7. 選擇是否公開
/// 8.執行gh repo create

async function selectAndApplyIgnoreTemplate() {
    const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!rootPath) {
        logError("無法取得igonre.txt專案根目錄", false)
        return;
    }
    const ignorePath = path.join(rootPath, '.gitignore');
    let hasIgnoreFile = fs.existsSync(ignorePath);
    if (hasIgnoreFile) return
    const ignoreDir = path.join(sidebarManger.context!.extensionPath, 'src/vscode_sidebar/git/igonre');
    let templates = fs.readdirSync(ignoreDir)
        .filter(f => f.endsWith('_igonre.txt'))
        .map(f => ({ label: f.replace('_igonre.txt', ''), file: f }));
    if (templates.length === 0) {
        vscode.window.showWarningMessage('No .gitignore sample.');
        return;
    }
    const picked = await vscode.window.showQuickPick(templates, { placeHolder: 'Create .gitignore Sample' });
    if (!picked) return;
    const templatePath = path.join(ignoreDir, picked.file);
    const content = fs.readFileSync(templatePath, 'utf8');



    fs.writeFileSync(ignorePath, content, 'utf8');
    vscode.window.showInformationMessage(`Create ${picked.label} .ignore`);
}

export async function gitInitAndPush() {
    const rootPath = getRootPath();
    if (!rootPath) {
        vscode.window.showErrorMessage('⚠️ 無法取得目前的 workspace 資料夾。');
        return;
    }
    await selectAndApplyIgnoreTemplate()
    const terminal = runTerminal('Git Init');
    // create Readme
    const readmePath = path.join(rootPath, 'README.md');
    if (!fs.existsSync(readmePath)) {
        fs.writeFileSync(readmePath, '# Git Init');
    }
    // Step 1: git init
    terminal.sendText(`cd "${rootPath}"`);
    terminal.sendText(`git init`);
    gitDataProvider.refresh()
    // Step 2: git add .
    terminal.sendText(`git add .`);

    // Step 3: git commit
    terminal.sendText(`git commit -m "Initial commit"`);

    // Step 4: 檢查是否安裝 gh CLI
    const ghInstalled = await isGhInstalled();
    if (!ghInstalled) {
        const install = await vscode.window.showWarningMessage(
            'Install GitHub CLI (gh)？',
            'Brew install', 'View GitHub CLI', 'Cancel'
        );

        if (install === 'Brew install') {
            if (os.platform() === 'darwin') {
                // macOS 系統，使用 brew 安裝
                const installTerminal = runTerminal('Install gh CLI');
                installTerminal.sendText(`brew install gh`);
            } else {
                vscode.window.showWarningMessage('目前僅支援 macOS 自動安裝，請手動前往 https://cli.github.com/');
            }
            return;
        } else if (install === 'View GitHub CLI') {
            vscode.env.openExternal(vscode.Uri.parse('https://cli.github.com/'));
            return;
        } else {
            return; // 使用者取消
        }
    }
    const loggedIn = await ensureGitHubCliLoggedIn();
    if (!loggedIn) {
        return;
    }
    // Step 5: 輸入 repo 名稱（預設為目前資料夾名稱）
    const defaultRepoName = path.basename(rootPath);
    const repoName = await vscode.window.showInputBox({
        title: 'GitHub Repo name',
        value: defaultRepoName,
        placeHolder: 'my-awesome-project',
    });
    if (!repoName) {
        return;
    }

    // Step 6: 是否公開
    const visibility = await vscode.window.showQuickPick(['public', 'private'], {
        title: 'Set repository visibility',
        placeHolder: 'Choose visibility for the repository'
    });
    if (!visibility) {
        return;
    }

    // Step 7: 執行 gh repo create
    terminal.sendText(`gh repo create ${repoName} --${visibility} --source=. --remote=origin --push`);
}

async function isGhInstalled(): Promise<boolean> {
    return new Promise((resolve) => {
        exec('gh --version', (err, stdout) => {
            resolve(!err && stdout.includes('gh version'));
        });
    });
}

async function ensureGitHubCliLoggedIn(): Promise<boolean> {
    try {
        const result = await runCommand('gh auth status');
        if (result.includes('Logged in to github.com')) {
            return true;
        } else {
            throw new Error('Not logged in');
        }
    } catch (e) {
        const choice = await vscode.window.showWarningMessage(
            'You are not logged in to GitHub CLI.\nTo get started, please run: `gh auth login`',
            'Login Now', 'Cancel'
        );
        if (choice === 'Login Now') {
            const terminal = vscode.window.createTerminal('GitHub CLI Login');
            terminal.show();
            terminal.sendText('gh auth login');
        }
        return false;
    }
}
