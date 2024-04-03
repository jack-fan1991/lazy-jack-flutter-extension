
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const command_clean_architecture = "command_clean_architecture"

export function registerCleanArchitectureGenerate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(command_clean_architecture, async (folderUri) => {
        const featureName = await vscode.window.showInputBox({
            placeHolder: 'Enter feature name'
        });

        if (featureName) {
            const rootPath = vscode.workspace.workspaceFolders![0].uri.fsPath;
            const featurePath = path.join(rootPath, 'features', featureName);
            try {
                await fs.mkdirSync(featurePath);
                fs.mkdirSync(path.join(featurePath, 'data'));
                fs.mkdirSync(path.join(featurePath, 'domain'));
                fs.mkdirSync(path.join(featurePath, 'presentation'));
                fs.mkdirSync(path.join(featurePath, 'presentation', 'view_models'));
                fs.mkdirSync(path.join(featurePath, 'presentation', 'widgets'));
                fs.writeFileSync(path.join(featurePath, 'homepage.dart'), '');
                vscode.window.showInformationMessage('Feature created successfully.');
            } catch (err) {
                vscode.window.showErrorMessage('Failed to create feature');
            }
        }
    }));
}