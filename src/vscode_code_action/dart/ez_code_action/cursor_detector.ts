// import * as vscode from 'vscode';
// import { EzCodeActionProviderInterface } from '../../code_action';
// import { OpenCloseFinder } from '../../../utils/src/regex/open_close_finder';
// import { getCursorLineText } from '../../../utils/src/vscode_utils/editor_utils';

// let counter = new OpenCloseFinder()

// export class CurserDetector implements EzCodeActionProviderInterface {

//     public static readonly command_to_require = 'command.param.to.require';

//     getLangrageType() { return 'dart' }

//     // 編輯時對單行檢測
//     public provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] | undefined {
//         let cursorLineText = getCursorLineText()
//         if (cursorLineText == undefined) return undefined
//         let action = this.isConstructorParam(document, range, cursorLineText)
//         if (action != undefined) {
//             return [action]
//         }
//     }


//     setOnActionCommandCallback(context: vscode.ExtensionContext) {
//         // 注册 Quick Fix 命令
//         context.subscriptions.push(vscode.commands.registerCommand(CurserDetector.command_to_require, async () => {
//             runParamToRequireGenerator()
//         }));
//     }


//     isConstructorParam(document: vscode.TextDocument, range: vscode.Range, cursorLineText: string): vscode.CodeAction | undefined {
//         if (!cursorLineText.includes('(')) return undefined
//         counter.reset();
//         let start = range.start.line
//         let match = cursorLineText.match(smallOpenRegex)
//         let action :vscode.CodeAction | undefined =undefined
//         {
//             {
//                 if (match != null) {
//                     let allText = document.getText(new vscode.Range(start, 0, document.lineCount + 1, 0))
//                     const lines = allText.split('\n');
//                     let startLine = range.start.line;
//                     let endLine = range.start.line;
//                     let currentText = ''
//                     for (let i = 0; i < lines.length; i++) {
//                         let lineText = lines[i];
//                         if(lineText.includes('{')|| lineText.includes('}')) break 
//                         currentText += lineText + '\n'
//                         let matchOpen = lineText.match(smallOpenRegex)
//                         let matchClose = lineText.match(smallCloseRegex)
//                         counter.incrementOpen(matchOpen != null ? matchOpen.length : 0)
//                         counter.incrementClose(matchClose != null ? matchClose.length : 0)
//                         if (counter.isDirty()) {
//                             endLine++
//                         }
//                         else {
//                             endLine++
//                             range = new vscode.Range(startLine, 0, endLine, 0)
//                             let result = document.getText(range)
//                             action=this.createToRequireFixAction(range)
//                             break;
//                         }
//                     }

//                 }
        
//             return action
//             }
//         }
//     }

//     private createToRequireFixAction(range: vscode.Range): vscode.CodeAction {
//         let title = 'Convert to required'
//         const fix = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
//         fix.command = { command: CurserDetector.command_to_require, title: title, arguments: [range] };
//         fix.isPreferred = true;
//         return fix;
//     }




// }
