import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { toUpperCamelCase } from '../../utils/src/regex/regex_utils';
import { reFormat } from '../../utils/src/vscode_utils/activate_editor_utils';
import * as changeCase from "change-case";
import { APP } from '../../extension';
import { getRootPath } from '../../utils/src/vscode_utils/vscode_env_utils';
import { runTerminal } from '../../utils/src/terminal_utils/terminal_utils';

const command_clean_architecture = "command_generate_flutter_page";

export function registerFlutterPageGenerate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(command_clean_architecture, async (folderUri) => {
      let featureName = await vscode.window.showInputBox({
        placeHolder: 'Enter Page name',
      });

      featureName = changeCase.snakeCase(featureName || "");
      if (!featureName) return;

      const rootPath = folderUri.path;
      const upperCase = toUpperCamelCase(featureName);
      const mainClass = featureName;
      const className = `${upperCase}PageWidget`;
      const screenFileName = `${mainClass}_screen.dart`;
      const mainScreenPath = path.join(rootPath, screenFileName);

      try {
        // 建立主畫面
        fs.writeFileSync(mainScreenPath, getMainTemplate(mainClass));

        const uri = vscode.Uri.file(mainScreenPath);
        await vscode.window.showTextDocument(uri);
        reFormat();

        const prefix = APP.goRouter ? "GoRouter" : "Router";
        const mainWidget = `${className}`;
        const routeImportPath = `import 'package:${APP.flutterLibName}${mainScreenPath.replace(getRootPath() + "/lib", "")}';`;
        const routeFileName = `${mainClass}_route`;
        vscode.window
          .showInformationMessage(`💡 Register ${upperCase}Screen as ${prefix}?`, 'Yes', 'No')
          .then(async (value) => {
            if (value === 'Yes') {
              if (APP.goRouter) {
                // 建立 go_route 檔案
                const goRoutePath = path.join(rootPath, `${mainClass}_route.dart`);
                fs.writeFileSync(goRoutePath, getGoRouteTemplate(upperCase, mainWidget,routeFileName));
                runBuildRunnerForFolder(goRoutePath);
                const routeUri = vscode.Uri.file(goRoutePath);
                await vscode.window.showTextDocument(routeUri);
                reFormat();
                vscode.commands.executeCommand(
                  "command_create_go_route_configuration",
                  mainClass,
                  `${mainWidget}.routeName`,
                  routeImportPath,
                  mainWidget
                );
              } else {
                vscode.commands.executeCommand(
                  "command_create_routeConfiguration",
                  mainClass,
                  `${mainWidget}.routeName`,
                  routeImportPath,
                  mainWidget
                );
              }
            }
          });
      } catch (err) {
        vscode.window.showErrorMessage('❌ Failed to create page: ' + (err as any).message);
      }
    })
  );
}

function getMainTemplate(mainClass: string): string {
  const upperCase = toUpperCamelCase(mainClass);
  const camel = changeCase.camelCase(mainClass);
  const className = `${upperCase}PageWidget`;

  return `import 'package:flutter/material.dart';

class ${className} extends StatefulWidget {
  static const routeName = '/${camel}';
  const ${className}({super.key});

  @override
  State<${className}> createState() => _${className}State();
}

class _${className}State extends State<${className}> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("${className}"),
      ),
      body: const SafeArea(
        child: Center(
          child: Text("TODO: Implement ${className}"),
        ),
      ),
    );
  }
}
`;
}
function getGoRouteTemplate(upperCase: string, widgetName: string, fileName: string): string {
  const routeClass = `${upperCase}Route`;
  const screenClass = widgetName;

  return `import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '${changeCase.snakeCase(upperCase)}_screen.dart';

part '${fileName}.g.dart';

@TypedGoRoute<${routeClass}>(
  path: ${screenClass}.routeName,
)
@immutable
class ${routeClass} extends GoRouteData {
  const ${routeClass}();

  @override
  Widget build(BuildContext context, GoRouterState state) {
    return const ${screenClass}();
  }
}
`;
}

function runBuildRunnerForFolder(folderPath: string) {
  const fileDir = path.dirname(folderPath);
  const relativePath = fileDir.replace(getRootPath() + '/', ''); // 例如 lib/route
  runTerminal(`dart run build_runner build --build-filter="${relativePath}/*.dart" --delete-conflicting-outputs`);
}