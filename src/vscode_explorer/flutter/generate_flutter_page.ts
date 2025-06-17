
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { get, template } from 'lodash';
import { toUpperCamelCase } from '../../utils/src/regex/regex_utils';
import { reFormat } from '../../utils/src/vscode_utils/activate_editor_utils';
import * as changeCase from "change-case";
import { APP } from '../../extension';
import { getRootPath } from '../../utils/src/vscode_utils/vscode_env_utils';
import { showInfo } from '../../utils/src/logger/logger';
import { route_configuration_file_name, route_page_args_file_name } from './generate_route_temp';

const command_clean_architecture = "command_generate_flutter_page"

export function registerFlutterPageGenerate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(command_clean_architecture, async (folderUri) => {

        let featureName = await vscode.window.showInputBox({
            placeHolder: 'Enter Page name',
        });
        featureName = changeCase.snakeCase(featureName!)
        if (featureName) {
            const rootPath = folderUri.path;
            try {
         
                let mainClass = `${featureName}`;
                let upperCase = toUpperCamelCase(mainClass);

                let name = changeCase.snakeCase(mainClass);
                let mainScreenPath = path.join(rootPath, `${mainClass}_screen.dart`)
                
                fs.writeFileSync(mainScreenPath, getMainTemplate(mainClass));
                let cubit = path.join(mainScreenPath, `presentation/bloc/${name}_cubit.dart`)
         //open file
                const uri = vscode.Uri.file(mainScreenPath);
                await vscode.window.showTextDocument(uri);
                reFormat();
                let endFix = 'PageWidget'
                let mainWidget =`${upperCase}${endFix}`
                vscode.window.showInformationMessage(`💡 Register ${upperCase}Screen as route ?`, 'Yes', 'No').then((value) => {
                    if (value === 'Yes') {
                        vscode.commands.executeCommand("command_create_routeConfiguration", mainClass, `${mainWidget}.routeName`, `import 'package:${APP.flutterLibName}${mainScreenPath.replace(getRootPath() + "/lib", "")}';`, `${mainWidget}`, toUpperCamelCase(mainClass) );
                    }

                });


            } catch (err) {
                vscode.window.showErrorMessage('Failed to create feature');
            }
        }
    }));
}

function getMainTemplate(mainClass: string) {
  let upperCase = toUpperCamelCase(mainClass);
  let camel = changeCase.camelCase(mainClass);
  let name = changeCase.snakeCase(mainClass);
  let endFix = 'PageWidget';

  let className = `${upperCase}${endFix}`;
  let cubit = changeCase.camelCase(`${upperCase}Cubit`);
  let argType = `Route${upperCase}Args`;

  return `
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:${APP.flutterLibName}/route/${route_page_args_file_name}';

class ${argType} extends PageArgs {
  const ${argType}() : super(
          routeName: ${className}.routeName,
        );
}  

class ${className} extends StatefulWidget {
  static const routeName = '/${camel}';
  final ${argType} args;

  const ${className}({super.key, required this.args});

  @override
  State<${className}> createState() => _${className}State();
}

class _${className}State extends State<${className}> {
  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [],
      child: Builder(
        builder: (context) {
          return Scaffold(
            appBar: AppBar(
              title: Text("${className}"),
            ),
            body: SafeArea(
              child: Text("Args: \${widget.args}"),
            ),
          );
        },
      ),
    );
  }
}
`;
}