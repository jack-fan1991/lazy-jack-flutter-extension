
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { get, template } from 'lodash';
import { reFormat } from '../../utils/src/vscode_utils/activate_editor_utils';
import * as changeCase from "change-case";
import { APP } from '../../extension';
import { getRootPath } from '../../utils/src/vscode_utils/vscode_env_utils';
import { openEditor, readFileToText } from '../../utils/src/vscode_utils/editor_utils';

const command_create_routeConfiguration = "command_create_routeConfiguration"

export function registerCreateRouteConfiguration(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(command_create_routeConfiguration, async (routName: string, routeParam: string, importText: string, widgetName: string) => {
        let root = getRootPath()
        const routeDir = `${root}/lib/route`;  // 指向 lib/route 目錄
        const filePath = `${routeDir}/route_configuration.dart`;  // 路徑: lib/route/route_configuration.dart

        // 檢查目錄是否存在，如果不存在則創建它
        if (!fs.existsSync(routeDir)) {
            fs.mkdirSync(routeDir, { recursive: true });
        }
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, createRouteConfiguration(routName, routeParam, importText, widgetName));
            reFormat();
            openEditor(filePath)
            return
        }
        let text = readFileToText(filePath);
        let lines = text.split('\n');
        let linesTemp = [
            `// Auto-Generated File\n`,
            `\n`,
            `// This file is auto-generated by a VSCode extension.\n`,
            `\n`,
            `// - [Install Extension](https://marketplace.visualstudio.com/items?itemName=jackFan.lazy-jack)\n`,
            `// - [Read More](https://github.com/jack-fan1991/lazy-jack-flutter-extension/blob/HEAD/doc/clean_architecture.md)\n`,
            `\n`,
            `\n`,
            "",
        ]
        let importDone = false
        let routeDone = false
        let screenDone = false

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().startsWith('const String') && lines[i].trim().endsWith('=')) {
                lines[i] = lines[i] + ' ' + lines[i + 1].trim();
                lines.splice(i + 1, 1);
            }
        }
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            if(line.startsWith("///")){
                linesTemp.push(line)
                continue
            }
            if(line.startsWith("//")){
                continue
            }

            if (!line.startsWith("import") && !importDone) {
                if (line === "") {
                    linesTemp.push(line)
                    continue
                }
                linesTemp.push(importText + "\n")
                importDone = true
                linesTemp.push("")
                linesTemp.push("// ===== WARNING =====\n")
                linesTemp.push("// Avoid modifying this section to prevent formatting issues.\n")
                linesTemp.push("// ===== WARNING =====\n")
                linesTemp.push("\n")
            }
            if (!line.startsWith("const String")  && !routeDone && importDone) {

                linesTemp.push(`const String ROUTE_${changeCase.constantCase(routName)} = ${routeParam};\n
`)
                routeDone = true
                linesTemp.push("")
                linesTemp.push("// ===== WARNING =====\n")
                linesTemp.push("// Avoid modifying this section to prevent formatting issues.\n")
                linesTemp.push("// ===== WARNING =====\n")
                linesTemp.push("")
                linesTemp.push("")

            }
            if (line.includes("default:") && !screenDone && routeDone && importDone) {
                let temp = temScreen(routName, routeParam, importText, widgetName).split('\n');
                temp.forEach(element => {
                    linesTemp.push(element + "\n")
                });
                screenDone = true
            }
            linesTemp.push(line)
        }
        updateAndFormatFile(filePath, linesTemp.join('\n'));
        // // 將修改後的內容寫入檔案
        // fs.writeFileSync(filePath, linesTemp.join(''));
        // // 打開檔案並格式化
        // const document = await vscode.workspace.openTextDocument(filePath);
        // await vscode.window.showTextDocument(document);
        // await vscode.commands.executeCommand('editor.action.formatDocument');
    },),)
}


export async function updateAndFormatFile(filePath: string, content: string) {
    try {
        // 嘗試打開文件
        let document: vscode.TextDocument;
        if (vscode.workspace.textDocuments.some(doc => doc.uri.fsPath === filePath)) {
            document = vscode.workspace.textDocuments.find(doc => doc.uri.fsPath === filePath)!;
        } else {
            document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
        }

        // 確保文件已被顯示在編輯器中
        const editor = await vscode.window.showTextDocument(document);

        // 編輯文件內容
        await editor.edit(editBuilder => {
            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(document.getText().length)
            );
            editBuilder.replace(fullRange, content);
        });

        // 保存文件
        await document.save();

        // 格式化文件
        await vscode.commands.executeCommand('editor.action.formatDocument');
    } catch (error) {
        console.error('Error updating and formatting file:', error);
    }
}

export async function ensureRouteConfigurationUpdated(
    routeDir: string,
    fileName: string,
    content: string
) {
    const filePath = path.join(routeDir, fileName);

    // 確保目標目錄存在
    const dirUri = vscode.Uri.file(routeDir);
    try {
        await vscode.workspace.fs.stat(dirUri);
    } catch {
        // 目錄不存在，創建目錄
        await vscode.workspace.fs.createDirectory(dirUri);
    }

    // 確保文件存在
    const fileUri = vscode.Uri.file(filePath);
    try {
        await vscode.workspace.fs.stat(fileUri);
    } catch {
        // 文件不存在，創建空文件
        const emptyDocument = await vscode.workspace.openTextDocument(fileUri.with({ scheme: 'untitled' }));
        await vscode.window.showTextDocument(emptyDocument);
        await emptyDocument.save();
    }

    // 更新並格式化文件
    await updateAndFormatFile(filePath, content);
}

function temScreen(routName: string, routeParam: string, importText: string, widgetName: string): string {
    // 假設我們將這兩個參數用於路由配置的生成
    let constantCase = changeCase.constantCase(routName);

    // 使用這些參數來創建路由配置
    const routeTemplate = `
      case ROUTE_${constantCase}:
        return CupertinoPageRoute(
          builder: (context) => ${widgetName}(),
          settings: RouteSettings(name: settings.name),
        );
`;
    return routeTemplate

}


function createRouteConfiguration(routName: string, routeParam: string, importText: string, widgetName: string): string {
    // 假設我們將這兩個參數用於路由配置的生成
    let constantCase = changeCase.constantCase(routName);

    // 使用這些參數來創建路由配置
    const routeTemplate = `
//  Auto-Generated File

// This file is auto-generated by a VSCode extension.

// - [Install Extension](https://marketplace.visualstudio.com/items?itemName=jackFan.lazy-jack)
// - [Read More](https://github.com/jack-fan1991/lazy-jack-flutter-extension/blob/main/doc/assets_creater.md)


import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
${importText}

// ===== WARNING =====
// Avoid modifying this section to prevent formatting issues.
// ===== WARNING =====

const String ROUTE_${constantCase} = ${routeParam};

// ===== WARNING =====
// Avoid modifying this section to prevent formatting issues.
// ===== WARNING =====

class RouteConfiguration {
  
  /// \`\`\`dart
  /// import 'package:flutter/material.dart';
  /// import 'route_configuration2.dart';

  /// void main() {
  ///   runApp(MyApp());
  /// }

  /// class MyApp extends StatelessWidget {
  ///   @override
  ///   Widget build(BuildContext context) {
  ///     return MaterialApp(
  ///       title: 'My App',
  ///       initialRoute: ROUTE_HOME,
  ///       onGenerateRoute: RouteConfiguration.onGenerateRoute,
  ///     );
  ///   }
  /// }
  ///\`\`\`
  static Route<dynamic> generateRoute(RouteSettings settings) {
    switch (settings.name) {
      case ROUTE_${constantCase}:
        return CupertinoPageRoute(
          builder: (context) => ${widgetName}(),
          settings: RouteSettings(name: settings.name)
        );
      default:
        return CupertinoPageRoute(
          builder: (context) => Scaffold(
            body: Center(
              child: Text('No route defined for '),
            ),
          ),
          settings: RouteSettings(name: settings.name),
        );
    }
  }
}
`;
    return routeTemplate

}

function toUpperCamelCase(str: string): string {
    return str.replace(/(^\w|-\w)/g, clearAndUpper);
    function clearAndUpper(text: string) {
        return text.toUpperCase().replace('-', '');
    }
}

function changeCase_dotCase(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1.$2').toLowerCase();
}

/// ```dart
/// import 'package:flutter/material.dart';
/// import 'route_configuration2.dart';

/// void main() {
///   runApp(MyApp());
/// }

/// class MyApp extends StatelessWidget {
///   @override
///   Widget build(BuildContext context) {
///     return MaterialApp(
///       title: 'My App',
///       initialRoute: ROUTE_HOME,
///       onGenerateRoute: RouteConfiguration.onGenerateRoute,
///     );
///   }
/// }