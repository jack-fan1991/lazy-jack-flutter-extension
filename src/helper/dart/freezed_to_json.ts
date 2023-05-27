// import * as vscode from 'vscode';
// const command_dart_freezed_2_json = "command_dart_freezed_2_json"
// let s;
// let setter;
// let arr: string[] = [];

// export function registerFreezedToJson(context: vscode.ExtensionContext) {
//     context.subscriptions.push(vscode.commands.registerCommand(command_dart_freezed_2_json, async () => {
//         generator()
//     }));
// }


// async function generator() {
//     const editor = vscode.window.activeTextEditor;
//     if (!editor)
//         return;
//     const document = editor.document;
//     const fileName = document.fileName.split("/").pop().split(".")[0];
//     const fileNamePart = `part '${fileName}.g.dart';`;
//     const text = document.getText();
//     const lines = text.split('\n');
//     const classNames: string[] = [];


//     let partIndex = -1;
//     let importIndex = -1;


//     for (let i = 0; i < lines.length; i++) {
//         // find freezed class
//         if (i > 0) {
//             if (lines[i - 1].startsWith('@freezed') && lines[i].startsWith(`class`)) {
//                 let className = lines[i].trim().split(' ')[1];
//                 classNames.push(className);
//             }
//         }
//         // find if part string exist
//         if (lines[i].startsWith(fileNamePart)) {
//             partIndex = i;
//         }
//         // find last import
//         if (lines[i].startsWith(`import '`)) {
//             importIndex = i;
//         }


//     }

//     if (classNames.length == 0) {
//         vscode.window.showErrorMessage('No class name found in the file.');
//         return;
//     }

//     // insert part
//     let insertIdx: vscode.Position[] = [];
//     let insertString: string[] = [];
//     let msgString: string[] = [];


//     let currentIdx = -1;
//     if (partIndex === -1) {
//         if (importIndex === -1) {
//             insertIdx.push(new vscode.Position(0, 0))
//             insertString.push(`${fileNamePart}\n\n`)

//         } else {
//             insertIdx.push(new vscode.Position(importIndex + 1, 0))
//             insertString.push(`\n${fileNamePart}\n`)

//         }
//     }
//     for (const className of classNames) {
//         let fromJsonMethod = `factory ${className}.fromJson(Map<String, dynamic> json) => _${className}FromJson(json);`;
//         let toJsonMethod = `Map<String, dynamic> toJson() => _$${className}ToJson(this);`;
//         let classIndex = -1;
//         for (let i = 0; i < lines.length; i++) {
//             if (lines[i].startsWith(`class ${className}`)) {
//                 classIndex = i;
//             }
//             if (classIndex != -1 && lines[i].endsWith('}')) {
//                 const factoryRegex = new RegExp(`factory ${className}.fromJson`);
//                 const toJsonFactoryRegex = new RegExp(`${className}ToJson`);
//                 let text = document.getText();
//                 if (factoryRegex.test(text) && toJsonFactoryRegex.test(text)) {
//                     break;
//                 }
//                 let classCloseIndex = i;
//                 console.log(`} => ${classCloseIndex}=>${fromJsonMethod}`);
//                 if (!factoryRegex.test(text)) {
//                     insertIdx.push(new vscode.Position(classCloseIndex, 0))
//                     insertString.push(`\n  ${fromJsonMethod}\n`)

//                 }
//                 // if (!toJsonFactoryRegex.test(text)) {
//                 //     insertIdx.push(new vscode.Position(classCloseIndex, 0))
//                 //     insertString.push(`\n  ${toJsonMethod}\n`)
//                 // }
//                 break;

//             }

//         }
//     }

//     await editor.edit((editBuilder) => {
//         for (let i = 0; i < insertIdx.length; i++) {
//             editBuilder.insert(insertIdx[i], insertString[i]);
            
//         }
//     })
//     let newText = document.getText().split('\n');

//     for (let i = 0; i < newText.length; i++) {
//         for (let idx in insertString) {
//             if (newText[i].includes(insertString[idx].replace(/\n/g, ''))) {
//                 msgString.push(`[Line ${i + 1}] ${insertString[idx].replace(/\n/g, '')}`)
//             }
//         }
//     }
//     let msg = msgString.join('\n')
//     if (msgString.length == 0) {
//         msg = "Nothing to do"
//     }
//     vscode.window.showInformationMessage(`Freezed toJson Finish : \n${msg} `, '確定').then((selectedOption) => {

//     });
// }