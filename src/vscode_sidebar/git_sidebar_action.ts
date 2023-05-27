import { logInfo } from "../utils/src/logger/logger";
import { runCommand, runTerminal } from "../utils/src/terminal_utils/terminal_utils";
import { TreeScriptModel } from "../utils/src/vscode_feature/sidebar/sidebar_model";
import { getRootPath, getWorkspace, getWorkspacePath } from "../utils/src/vscode_utils/vscode_env_utils";
import * as vscode from 'vscode';

export async function createReflogOptionsInput(script:string){
    logInfo(`createReflogOptionsInput : ${script}`,false)
    let terminal = runTerminal(script,'Git');    
    let cwd =getRootPath()
    let text = await runCommand(`git reflog` ,cwd)
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
