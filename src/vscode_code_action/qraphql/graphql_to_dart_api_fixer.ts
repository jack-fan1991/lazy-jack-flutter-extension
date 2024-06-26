import path = require('path');
import * as vscode from 'vscode';
import { CodeActionProviderInterface } from '../code_action';
import { StatusCode } from '../error_code';
import { logInfo } from '../../utils/src/logger/logger';









import { EzCodeActionProviderInterface } from '../ez_code_action';
import { log } from 'console';
import { toLowerCamelCase, toUpperCamelCase } from '../../utils/src/regex/regex_utils';
import { is } from 'cheerio/lib/api/traversing';

// let counter = new OpenCloseFinder()
export class GraphqlToDartApiFixer implements EzCodeActionProviderInterface {

    public static readonly command = 'GraphqlToDartApiFixer.command';

    getLangrageType() { return '*' }

    // 編輯時對單行檢測
    public provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] | undefined {
        const editor = vscode.window.activeTextEditor;
        let fileEndWithQl = document.fileName.endsWith('.graphql')
        if (!editor || !fileEndWithQl) return [];
        const selection = editor.selection;
        const text = editor.document.getText(selection);
        if (text === "") return [];
        try {
            let lines = text.split('\n')
            let result = ''
            let isQlFile = false
            for (let i in lines) {
                let l = lines[i]
                if (isQlFile == false) {
                    isQlFile = l.startsWith('query') || l.startsWith('mutation') || l.startsWith('subscription')
                }
                if (!l.startsWith('#')) {
                    result += l
                }
            }
            console.log(`json: ${result}`);
            const quickFix = this.createCommonAction(GraphqlToDartApiFixer.command, document, range, "Graphql to dart api", text);
            // 將所有程式碼動作打包成陣列，並回傳
            return [quickFix];

        } catch (e) {
            return []
        }

    }

    createCommonAction(command: string, document: vscode.TextDocument, range: vscode.Range, title: string, text: string): vscode.CodeAction {
        const fix = new vscode.CodeAction(title, vscode.CodeActionKind.Refactor);
        fix.command = { command: command, title: title, arguments: [document, range, text] };
        fix.isPreferred = true;
        return fix;
    }



    setOnActionCommandCallback(context: vscode.ExtensionContext) {
        // 注册 Quick Fix 命令
        context.subscriptions.push(vscode.commands.registerCommand(GraphqlToDartApiFixer.command, async (document: vscode.TextDocument, range: vscode.Range, text: string) => {
            // create new editor
            let lines = text.split('\n') ?? []
            let newText = ''
            for (let l of lines) {
                let isQlLine = l.startsWith('query') || l.startsWith('mutation') || l.startsWith('subscription')
                if (isQlLine) {
                    let idx = lines.indexOf(l)
                    let result = splitAction(l, lines[idx + 1])
                    newText += createTemplate(result[0], result[1].trim())
                }
            }
            vscode.workspace.openTextDocument({ language: 'dart', content: newText }).then(document => {
                vscode.window.showTextDocument(document);
            });

        },),);

    }


}


function createTemplate(action: string, apiName: string) {
   
    let bigCamelAction = toUpperCamelCase(action)
    let bigCamelApiName = toUpperCamelCase(apiName)
    let smallCamelAction = toLowerCamelCase(action)
    let smallCamelApiName = toLowerCamelCase(apiName)
    let objName = `${bigCamelAction}__${bigCamelApiName}`

    let methodName = ''
    if(action.toLowerCase() === 'mutation'){
        smallCamelAction ='mutate'
    }
    if (bigCamelApiName.toLowerCase().startsWith('archive') || bigCamelApiName.toLowerCase().startsWith('update') || bigCamelApiName.toLowerCase().startsWith('create') || bigCamelApiName.toLowerCase().startsWith('query') || bigCamelApiName.toLowerCase().startsWith('mutation') || bigCamelApiName.toLowerCase().startsWith('subscription')) {
        methodName = smallCamelApiName
    } else {
        methodName = `${bigCamelApiName}`
    }
    if (action === 'subscription') {
        return `
    Stream<QueryResult<${objName}>> ${smallCamelAction}__${bigCamelApiName}({
        required Variables__${objName} params,
        });
    
    `
    }

    return `
    Future<Result<${objName}>> ${smallCamelAction}__${bigCamelApiName}({
        required Variables__${objName} params,
      });
    
    `

}


export function isGraphqlFile(text: string) {
    let lines = text.split('\n')
    let isQlFile = false
    for (let i in lines) {
        let l = lines[i]
        if (isQlFile == false) {
            isQlFile = l.startsWith('query') || l.startsWith('mutation') || l.startsWith('subscription')
        }
    }
    return isQlFile

}

function splitAction(text: string, nextText: string) {
    let action = ''
    let apiName = ''
    let updateName = false;
    text += nextText
    for (let i of text) {
        let c = i
        if (c == ' ') {
            action = action
            updateName = true
        }
        if (c == "(" || c == "{") {
            break
        }
        if (updateName) {
            apiName += c
        } else {
            action += c
        }

    }
    return [action, apiName]
}

