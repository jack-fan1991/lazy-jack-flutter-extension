// import * as vscode from 'vscode';
// const command_dart_2_require_param = "command_dart_2_require_param"
// let s;
// let setter;
// let arr: string[] = [];
// export function runParamToRequireGenerator(){
//     vscode.commands.executeCommand(command_dart_2_require_param)
// }

// export function registerToRequireParams(context: vscode.ExtensionContext) {
//     context.subscriptions.push(vscode.commands.registerCommand(command_dart_2_require_param, async () => {
//         paramToRequireGenerator()
//     }));
// }

// function paramToRequireGenerator() {
//     const editor = vscode.window.activeTextEditor;
//     if (!editor)
//         return;
//     const selection = editor.selection;
//     let text = editor.document.getText(selection);
//     if (text.length < 1) {
//         vscode.window.showErrorMessage('No selected properties.');
//         return;
//     }
//     let properties = text.split(',');
//     let required: string[] = [];
//     let unRequired: string[] = [];
//     for (let p of properties) {
//         required.push("required " + p)
//     }
//     let result = '{'
//     for (let r of required) {
//         result += r + ", "
//     }
//     result += "}"
//     editor.document.getText(editor.selection)
//     let e = new vscode.WorkspaceEdit()

//     e.replace(editor.document.uri, editor.selection, result)
//     vscode.workspace.applyEdit(e)
// }
