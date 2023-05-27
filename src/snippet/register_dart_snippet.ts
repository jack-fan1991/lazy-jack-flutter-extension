// import * as vscode from 'vscode';

// const command_import_freezed_part = 'dart.import.freezed';
// const command_create_freezed_class_by_base_fileName = 'command_create_freezed_class_by_base_fileName';
// const command_create_freezed_union_class_by_base_fileName = 'command_create_freezed_union_class_by_base_fileName';
// const command_new_freezed_state_by_base_fileName = 'command_add_freezed_state_by_base_fileName';
// const command_create_from_json = 'command_create_from_json';

// const snippet_import_freezed = 'import freezed part';
// const snippet_create_freezed_class = 'Freezed Data Class';
// const snippet_create_freezed_union = 'Freezed Union Class';
// const snippet_new_freezed_state = 'Add New freezed State';
// const snippet_create_from_json = 'Crate FromJson';

// export function registerDartSnippet(context: vscode.ExtensionContext) {
//   context.subscriptions.push(vscode.commands.registerCommand(command_import_freezed_part, async () => {
//     await vscode.commands.executeCommand('editor.action.insertSnippet', { name: snippet_import_freezed });
//   }));
//   context.subscriptions.push(vscode.commands.registerCommand(command_create_freezed_class_by_base_fileName, async () => {
//     await vscode.commands.executeCommand('editor.action.insertSnippet', { name: snippet_create_freezed_class });
//   }));
//   context.subscriptions.push(vscode.commands.registerCommand(command_create_freezed_union_class_by_base_fileName, async () => {
//     await vscode.commands.executeCommand('editor.action.insertSnippet', { name: snippet_create_freezed_union });
//   }));
//   context.subscriptions.push(vscode.commands.registerCommand(command_new_freezed_state_by_base_fileName, async () => {
//     await vscode.commands.executeCommand('editor.action.insertSnippet', { name: snippet_new_freezed_state });
//   }));
//   context.subscriptions.push(vscode.commands.registerCommand(command_create_from_json, async () => {
//     await vscode.commands.executeCommand('editor.action.insertSnippet', { name: snippet_create_from_json });
//   }));

// }