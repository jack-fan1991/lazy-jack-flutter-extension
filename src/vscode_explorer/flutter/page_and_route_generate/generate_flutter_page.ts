
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { toUpperCamelCase } from '../../../utils/src/regex/regex_utils';
import { reFormat } from '../../../utils/src/vscode_utils/activate_editor_utils';
import * as changeCase from "change-case";
import { APP } from '../../../extension';
import { getRootPath } from '../../../utils/src/vscode_utils/vscode_env_utils';
import { route_configuration_file_name, route_page_args_file_name } from './generate_route_temp';

const COMMAND_ID = "lazyJack.flutter.createTypeSafePage";

export function registerFlutterPageGenerate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(COMMAND_ID, async (folderUri) => {

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
                let mainScreenPath = path.join(rootPath, `${mainClass}_page.dart`)
                 const argType = `Route${upperCase}Args`;
                fs.writeFileSync(mainScreenPath, getMainTemplate(mainClass));
                let cubit = path.join(mainScreenPath, `presentation/bloc/${name}_cubit.dart`)
                const uri = vscode.Uri.file(mainScreenPath);
                await vscode.window.showTextDocument(uri);
                reFormat();
                let endFix = 'Page'
                let mainWidget =`${upperCase}${endFix}`
                vscode.window.showInformationMessage(`💡 Register ${upperCase}Page to route ?`, 'Yes', 'No').then((value) => {
                    if (value === 'Yes') {
                        vscode.commands.executeCommand("command_create_routeConfiguration", mainClass, `${mainWidget}.routeName`, `import 'package:${APP.flutterLibName}${mainScreenPath.replace(getRootPath() + "/lib", "")}';`, `${mainWidget}`, toUpperCamelCase(mainClass) ,argType);
                    }

                });


            } catch (err) {
                vscode.window.showErrorMessage('Failed to create page');
            }
        }
    }));
}
function getMainTemplate(mainClass: string) {
  const upperCase = toUpperCamelCase(mainClass);
  const camel = changeCase.camelCase(mainClass);
  const name = changeCase.snakeCase(mainClass);
  const endFix = 'Page';

  const className = `${upperCase}${endFix}`;
  const cubit = changeCase.camelCase(`${upperCase}Cubit`);
  const argType = `Route${upperCase}Args`;
 // 使用 web path 規範（全部小寫、用 - 分隔）
  const webPath = '/' + changeCase.paramCase(mainClass);
  return `
import 'package:flutter/material.dart';
import 'package:${APP.flutterLibName}/route/${route_page_args_file_name}';

class ${argType} extends RouteArgs {
  // TODO: Define the parameters required for this page here
  final String? exampleId;

  const ${argType}({this.exampleId})
      : super(routeName: ${className}.routeName);

  factory ${argType}.fromMap(Map<String, dynamic> map) {
    return ${argType}(
      exampleId: map['exampleId'] as String?,
    );
  }
}


class ${className} extends StatefulWidget {
  static const routeName = '${webPath}';
  final ${argType} args;

  const ${className}({
    super.key,
    required this.args,
  });

  @override
  State<${className}> createState() => _${className}State();
}

class _${className}State extends State<${className}> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text("${className}"),
      ),
      body: SafeArea(
        child: Center(
          child: Text("Args: \${widget.args}"),
        ),
      ),
    );
  }
}
`;
}
