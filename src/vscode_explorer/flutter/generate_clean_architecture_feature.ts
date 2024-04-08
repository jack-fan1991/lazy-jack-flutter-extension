
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { get, template } from 'lodash';
import { toUpperCamelCase } from '../../utils/src/regex/regex_utils';
import { reFormat } from '../../utils/src/vscode_utils/activate_editor_utils';

const command_clean_architecture = "command_clean_architecture"

export function registerCleanArchitectureGenerate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(command_clean_architecture, async (folderUri) => {

        const featureName = await vscode.window.showInputBox({
            placeHolder: 'Enter feature name',
        });

        if (featureName) {
            const rootPath = folderUri.path;
            const featurePath = path.join(rootPath, featureName);
            try {
                await fs.mkdirSync(featurePath);
                fs.mkdirSync(path.join(featurePath, 'data'));
                fs.mkdirSync(path.join(featurePath, 'domain'));
                fs.mkdirSync(path.join(featurePath, 'presentation'));
                fs.mkdirSync(path.join(featurePath, 'presentation', 'bloc'));
                fs.mkdirSync(path.join(featurePath, 'presentation', 'widgets'));
                let mainClass = `${featureName}`;
                let dart =path.join(featurePath, `${mainClass}.dart`)
                fs.writeFileSync(dart, getTemplate(mainClass));
                //open file
                const uri = vscode.Uri.file(dart);
                await vscode.window.showTextDocument(uri);
                vscode.window.showInformationMessage('Feature created successfully.');
                reFormat();
            } catch (err) {
                vscode.window.showErrorMessage('Failed to create feature');
            }
        }
    }));
}


function getTemplate(mainClass: string) {
let upperCase =toUpperCamelCase(mainClass);
return `
import 'package:flutter/material.dart';

class ${upperCase} extends StatelessWidget {
  const ${upperCase}({super.key});

  @override
  Widget build(BuildContext context) {
    return Container();
  }
}

`

}