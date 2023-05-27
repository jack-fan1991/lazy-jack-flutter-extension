import exp = require('constants');
import * as vscode from 'vscode';
import * as path from 'path';
import cheerio from 'cheerio';
import { onTypeScript } from '../../utils/src/language_utils/language_utils';
import { runTerminal } from '../../utils/src/terminal_utils/terminal_utils';
import { checkDirInEvn, removeDirInEvn } from '../../utils/src/vscode_utils/vscode_env_utils';
import { getWebData } from '../../utils/src/http';
import { replaceText } from '../../utils/src/vscode_utils/editor_utils';


export async function publishVsCodeExtension() {
    onTypeScript(onPackageJsonParse, () => { }, true)
}



class DependenciesInfo {
    name: string;
    uri: string;
    branch: string;
    constructor(name: string, uri: string, branch: string) {
        this.name = name;
        this.uri = uri;
        this.branch = branch;
    }
}


function findGitExtension(data: any): DependenciesInfo[] {
    let gitExtensions: DependenciesInfo[] = [];
    let keys = Object.keys(data)

    for (let key of keys) {
        let extension = data[key]
        let gitInfo = extension['git']
        if (gitInfo != undefined) {
            gitExtensions.push(new DependenciesInfo(key, gitInfo['url'], gitInfo['ref']))
        }
    }
    return gitExtensions
}
let gitUrl = new Map<string, any>()

const onVersionSelect = async function onVersionSelect(dependencies: string, item: any) {
    let version = item.label
    let currentVersion = item.description?.split('=>')[item.description?.split('=>').length - 1]
    currentVersion = currentVersion?.replace(' ', '')
    let msg = ''
    if (currentVersion === version) {
        msg = `${dependencies}目前版本${currentVersion} 強制更新 ${version}`
    }
    else {
        msg = `${dependencies}目前版本${currentVersion} 確定要更新至 ${version}`
    }
    console.log(`Selected version: ${version}`);
    vscode.window.showInformationMessage(msg, '確定', '取消').then(async (option) => {

        if (option === '確定') {
            let searchValue = `${dependencies}:\n    git:\n      url: ${gitUrl.get(dependencies)}\n      ref: ${currentVersion}\n`
            let yamlPath = path.join(vscode.workspace.rootPath ?? '', 'pubspec.yaml');
            let replaceValue = `${dependencies}:\n    git:\n      url: ${gitUrl.get(dependencies)}\n      ref: ${version}\n`
            // find yaml editor
            let editor = vscode.window.visibleTextEditors.find(e => e.document.fileName === yamlPath)
            if (!editor) {
                return
            }
            // 修改yaml 中的 version
            const document = editor.document;
            const start = new vscode.Position(0, 0);
            const end = new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);
            const textRange = new vscode.Range(start, end);
            const text = document.getText();
            const startIndex = text.indexOf(searchValue);
            if (startIndex !== -1) {
                const endIndex = startIndex + searchValue.length;
                const range = new vscode.Range(document.positionAt(startIndex), document.positionAt(endIndex));
                await editor.edit((editBuilder) => {
                    editBuilder.replace(range, replaceValue);
                });
                // 刪除local ..pub-cache/test
                let delPubCachePath: string = '.pub-cache/git';
                checkDirInEvn(() => {
                    vscode.window.showInformationMessage(`正在刪除${delPubCachePath}`)
                    removeDirInEvn(
                        () => {
                            vscode.window.showInformationMessage(`已清理${delPubCachePath}`)
                            runTerminal('flutter pub get')
                        }, delPubCachePath)
                }, () => {
                    vscode.window.showWarningMessage(`找不到${delPubCachePath}`)
                },
                    delPubCachePath)

            }
        }
    });

}

const onPackageJsonParse = async function onPackageJsonParse(data: any) {
    let uri = `https://marketplace.visualstudio.com/items?itemName=${data['publisher']}.${data['name']}`
    let body = await getWebData(uri)
    let $ = cheerio.load(body);
    let lastVersion = $('meta[property="og:image"]').attr('content')?.split('/')[6] ?? ""
    console.log(lastVersion);
    let currentVersion = data['version']
    let versionSplit = lastVersion.split('.');
    let updateVersion = +versionSplit[versionSplit.length - 1]
    updateVersion++
    let searchValue = `version": "${currentVersion}"`
    let replacePath = path.join(vscode.workspace.rootPath ?? '', 'package.json');
    versionSplit[versionSplit.length - 1] = `${updateVersion}`
    let replaceVersion = versionSplit.join('.')
    let replaceValue = `version": "${replaceVersion}"`
    vscode.window.showInformationMessage(`${data['displayName']}${currentVersion} update to ${replaceValue}`, 'publish').then(async (options) => {
        await replaceText(replacePath, searchValue, replaceValue);
        if (options === 'publish') {
            runTerminal("vsce publish");
        } 
        // else {
        //     await terminal_util.runCommand("npm run build", (stdout) => {
        //         terminal_util.runTerminal("vsce publish");
        //     },
        //     undefined,
        //     false,
        //     )
        // }
    })


}

