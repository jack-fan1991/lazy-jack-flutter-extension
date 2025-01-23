import { logInfo, showErrorMessage, showInfo } from "../utils/src/logger/logger";
import { TerminalCommand, runCommand, runTerminal } from "../utils/src/terminal_utils/terminal_utils";
import { TreeScriptModel } from "../utils/src/vscode_feature/sidebar/sidebar_model";
import { getRootPath, getWorkspace, getWorkspacePath, isWindows } from "../utils/src/vscode_utils/vscode_env_utils";
import * as vscode from 'vscode';
import { showPicker } from "../utils/src/vscode_utils/vscode_utils";
import { APP } from "../extension";
import * as changeCase from "change-case";


export async function createReflogOptionsInput(script: string) {
    logInfo(`createReflogOptionsInput : ${script}`, false)
    let terminal = runTerminal(script, 'Git');
    let cwd = getRootPath()
    let text = await runCommand(`git reflog`, cwd)
    const newLocal = /^(\b[0-9a-f]{7,40}\b)\s(.*)/gm;
    let regex = newLocal
    let matches = text.match(regex);
    let items = [];
    if (matches == undefined) {
        return
    }
    for (let match of matches) {
        let m = match.match(/^(\b[0-9a-f]{7,40}\b)\s(.*)/);;
        if (m == undefined) {
            return
        }
        items.push({ label: m[1], description: m[2] })
    }

    let quickPick = vscode.window.createQuickPick();
    quickPick.items = items;
    quickPick.placeholder = 'select reset hash';
    quickPick.onDidAccept(() => {
        let hash = quickPick.selectedItems[0].label
        console.log(`Selected item: ${hash}`);
        quickPick.dispose();
        terminal!.sendText("q");
        vscode.window.showInformationMessage(`Hard reset  to ${hash}`, "Confirm", "Cancel").then(
            (value) => {
                if (value == "Confirm") {
                    terminal.sendText(`git reset --hard ${hash}`);
                }
            }
        );
    });

    quickPick.show();
}




export async function createMergeNoFFInput(script: string) {
    // find local branch and map to ts array

    const gitCommand: TerminalCommand = {
        windows: `git branch`,
        mac: `git branch `,
    };
    let currentBranch = (await runCommand(`git branch --show-current`)).replace('\n', '')
    let allBranch = await runCommand(isWindows() ? gitCommand.windows : gitCommand.mac)
    let branches = allBranch.split('\n')
    let items: { label: string; description: string }[] = []
    branches.filter((x) => !x.startsWith('*')).filter((x) => x != currentBranch).map((x) => x.trim()).filter((x) => x != '').map((x) =>
        items.push(
            {
                label: x,
                description: ''
            }
        )
    )

    showPicker('Merge into branch', items, (item) => {
        let checkoutBranch = item.label.replace('*', '').trim()
        runCommand(
            `git checkout ${checkoutBranch}`,
        ).then(async () => {
            // 檢查衝突
            runCommand(
                `git diff ${currentBranch}`,
            ).then((r) => {
                if (r != "") {
                    showErrorMessage(`[ Merge failed conflict ] => ${r}`)

                    // rebase
                    vscode.window.showInformationMessage(`Rebase  ${currentBranch} onto ${checkoutBranch}`, 'Confirm').then(async (result) => {
                        if (result == 'Confirm') {
                            runTerminal(
                                `git checkout ${currentBranch}`
                            )
                            runTerminal(
                                `git rebase ${checkoutBranch}`
                            )
                            runTerminal(
                                'git status'
                            )
                            logInfo("Rebase done")

                        }
                    })


                } else {

                    // merge --no-ff
                    // show input dialog
                    let defaultCommit = `Merge into '${checkoutBranch}' from ${currentBranch}`
                    vscode.window.showInputBox({ prompt: `Enter commit or "default"`, value: `${defaultCommit}` }).then(async (commit) => {
                        let cmd = `git merge ${currentBranch} --no-ff -m "${commit}"`
                        showInfo(cmd)
                        runCommand(
                            cmd,
                        ).then((r) => {
                            if (r != "") {
                                showInfo(`${r}`)
                            }
                            runTerminal(
                                'git status'
                            )
                            showInfo(`Merge completed`)

                        })
                    })

                }


            })




        }
        )
    }
    )
}



export async function createCheckout(script: string) {

    const gitCommand: TerminalCommand = {
        windows: `git branch`,
        mac: `git branch `,
    };
    let currentBranch = await runCommand(`git branch --show-current`)
    let allBranch = await runCommand(isWindows() ? gitCommand.windows : gitCommand.mac)
    let branches = allBranch.split('\n')
    let items: { label: string; description: string }[] = []
    branches.filter((x) => !x.startsWith('*')).filter((x) => x != currentBranch).map((x) => x.trim()).filter((x) => x != '').map((x) =>
        items.push(
            {
                label: x,
                description: ''
            }
        )
    )

    showPicker('Checkout to', items, (item) => {
        let checkoutBranch = item.label.replace('*', '').trim()
        runCommand(
            `git checkout ${checkoutBranch}`,
        ).then(async () => {
            runTerminal(
                'git status'
            )
        }
        )
    }
    )
}



export async function createBranch(script: string) {

    // 顯示主菜單
    const branchType = await vscode.window.showQuickPick(
        ['Feature', 'Bugfix', 'Refactor','Patch' ,'Chore'], // 第一層選單
        { placeHolder: 'Select a branch type' }
    );

    if (!branchType) return; // 如果取消選擇則退出

    // 顯示次級菜單
    const userName = await vscode.window.showInputBox({
        prompt: `Enter your user name for the ${branchType} branch`,
        placeHolder: 'Enter your name',
        value :changeCase.snakeCase(APP.myName) 
        
    });

    if (!userName) return; // 如果用戶名為空則退出

    const branchName = await vscode.window.showInputBox({
        prompt: `Enter branch name for ${branchType}`,
        placeHolder: 'Enter branch name',
    });

    if (!branchName) return; // 如果分支名稱為空則退出

    // 拼接完整分支名稱
    const fullBranchName = `${branchType.toLowerCase()}/${userName}/${branchName}`;

    // 執行 Git 命令
    const terminal = vscode.window.createTerminal('Git Branch Creator');
    terminal.show();
    terminal.sendText(`git branch ${fullBranchName}`);
    terminal.sendText(`git checkout ${fullBranchName}`);
    terminal.sendText('git status');

    vscode.window.showInformationMessage(`Branch "${fullBranchName}" created and checked out!`);

    // vscode.window.showInputBox({ prompt: `Enter branch name"`, value: '' }).then(async (name) => {
    //     if (name === '' || name == undefined) return
    //     let cmd = `git branch ${name}`
    //     showInfo(cmd)
    //     runCommand(
    //         cmd,
    //     ).then((r) => {
    //         if (r != "") {
    //             showInfo(`${r}`)
    //         }
    //         runTerminal(
    //             `git checkout ${name} && git status`
    //         )

    //     },
    //         (f) => {
    //             showErrorMessage(`Error: ${f}`)
    //         }
    //     )
    // })

}



