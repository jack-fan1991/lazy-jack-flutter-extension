import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { get, template } from 'lodash';
import { reFormat } from '../../../utils/src/vscode_utils/activate_editor_utils';
import * as changeCase from "change-case";
import { APP } from '../../../extension';
import { getRootPath } from '../../../utils/src/vscode_utils/vscode_env_utils';
import { openEditor, readFileToText } from '../../../utils/src/vscode_utils/editor_utils';

const command_create_routeConfiguration = "command_create_routeConfiguration"
export const route_configuration_file_name = "route_configuration.dart"
export const route_page_args_file_name = "page_args.dart"
export const valid_routes_file_name = "valid_routes.dart"

export function registerCreateRouteConfiguration(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(command_create_routeConfiguration, async (routeName: string, routeParam: string, importText: string, widgetName: string, mainClass: string, routeArg: string) => {
        let root = getRootPath()
        const routeDir = `${root}/lib/route`;
        const routeConfigurationFlePath = `${routeDir}/${route_configuration_file_name}`;
        const pageArgFilePath = `${routeDir}/${route_page_args_file_name}`;
        const validRoutesFilePath = `${routeDir}/${valid_routes_file_name}`;

        // 確保目錄存在
        if (!fs.existsSync(routeDir)) {
            fs.mkdirSync(routeDir, { recursive: true });
        }

        // 如果 page args 文件不存在，創建它
        if (!fs.existsSync(pageArgFilePath)) {
            await updateAndFormatFile(pageArgFilePath, createPageArgsFile());
        }

        // 如果配置文件不存在，創建新文件
        if (!fs.existsSync(routeConfigurationFlePath)) {
            const newContent = createRouteConfiguration(routeName, routeParam, importText, widgetName, mainClass, routeArg)
            const newRouteHandler = generateRouteHandler(routeName, routeParam, widgetName, routeArg)
            await updateAndFormatFile(routeConfigurationFlePath, newContent, true, newRouteHandler);
        } else {
            // 更新現有的路由配置文件
            await updateExistingRouteConfiguration(routeConfigurationFlePath, routeName, routeParam, importText, widgetName, mainClass, routeArg);
        }

        // 更新 valid_routes.dart
        await updateValidRoutesFile(validRoutesFilePath, routeConfigurationFlePath);
    }));
}

async function updateExistingRouteConfiguration(
    filePath: string,
    routName: string,
    routeParam: string,
    importText: string,
    widgetName: string,
    mainClass: string,
    routeArg: string
) {
    let text = readFileToText(filePath);
    let lines = text.split('\n');

    // 解析現有內容
    const parseResult = parseRouteFile(lines);

    // 添加新的 import
    if (!parseResult.imports.includes(importText.trim())) {
        parseResult.imports.push(importText.trim());
    }

    // 添加新的路由常量
    const newRouteConstant = `const String ROUTE_${changeCase.constantCase(routName)} = ${routeParam};`;
    if (!parseResult.routeConstants.some(route => route.includes(`ROUTE_${changeCase.constantCase(routName)}`))) {
        parseResult.routeConstants.push(newRouteConstant);
    }

    // 添加新的路由處理
    const newRouteHandler = generateRouteHandler(routName, routeParam, widgetName, routeArg);
    if (!parseResult.routeHandlers.some(handler => handler.includes(`ROUTE_${changeCase.constantCase(routName)}`))) {
        parseResult.routeHandlers.push(newRouteHandler);
    }

    // 重新生成文件內容
    const newContent = generateCompleteRouteFile(parseResult);

    await updateAndFormatFile(filePath, newContent, true, newRouteHandler);
}

function parseRouteFile(lines: string[]) {
    const result = {
        header: [] as string[],
        imports: [] as string[],
        routeConstants: [] as string[],
        routeHandlers: [] as string[],
        classFooter: [] as string[]
    };
    
    let currentSection = 'header';
    let inRouteHandler = false;
    let currentHandler = '';
    let braceCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // 跳過空白行和註解行（除了 /// 文檔註解）
        if (line.trim() === '' && currentSection === 'header') {
            result.header.push(line);
            continue;
        }
        
        if (line.startsWith('//') && !line.startsWith('///') && currentSection === 'header') {
            result.header.push(line);
            continue;
        }
        
        // 處理 import 語句
        if (line.trim().startsWith('import ')) {
            currentSection = 'imports';
            const cleanImport = line.trim().replace(/\s+/g, ' '); // 清理多餘空格
            if (!result.imports.includes(cleanImport)) {
                result.imports.push(cleanImport);
            }
            continue;
        }
        
        // 處理路由常量
        if (line.trim().startsWith('const String ROUTE_')) {
            currentSection = 'constants';
            // 合併多行常量定義
            let constantLine = line.trim();
            if (constantLine.endsWith('=') && i + 1 < lines.length) {
                constantLine += ' ' + lines[i + 1].trim();
                i++; // 跳過下一行
            }
            if (!result.routeConstants.includes(constantLine)) {
                result.routeConstants.push(constantLine);
            }
            continue;
        }
        
        // 處理路由處理器
        if (line.trim().startsWith('case ROUTE_')) {
            currentSection = 'handlers';
            inRouteHandler = true;
            currentHandler = line;
            braceCount = 0;
            continue;
        }
        
        if (inRouteHandler) {
            currentHandler += '\n' + line;
            
            // 計算大括號數量來判斷路由處理器是否結束
            for (const char of line) {
                if (char === '{') braceCount++;
                if (char === '}') braceCount--;
            }
            
            // 如果遇到 break; 或 return，表示當前 case 結束
            if (line.trim() === 'break;' || (line.trim().endsWith(');') && braceCount <= 0)) {
                result.routeHandlers.push(currentHandler);
                inRouteHandler = false;
                currentHandler = '';
                continue;
            }
        }
        
        // 處理類的尾部
        if (line.includes('default:')) {
            currentSection = 'footer';
        }
        
        if (currentSection === 'footer' && !inRouteHandler) {
            result.classFooter.push(line);
        }
    }
    
    return result;
}

function generateCompleteRouteFile(parseResult: any): string {
    // 生成文件頭部註解
    const header = [
        '// Auto-Generated File',
        '',
        '// This file is auto-generated by a VSCode extension.',
        '',
        '// - [Install Extension](https://marketplace.visualstudio.com/items?itemName=jackFan.lazy-jack)',
        '// - [Read More](https://github.com/jack-fan1991/lazy-jack-flutter-extension/blob/HEAD/doc/clean_architecture.md)',
        '',
        ''
    ];
    
    // 排序並清理 imports
    const sortedImports = parseResult.imports
        .map((imp: string) => imp.replace(/\s+/g, ' ').trim()) // 清理空格
        .sort((a: string, b: string) => {
            // 先排 dart 內建庫，再排 package，最後排相對路徑
            if (a.includes('dart:') && !b.includes('dart:')) return -1;
            if (!a.includes('dart:') && b.includes('dart:')) return 1;
            if (a.includes('package:') && !b.includes('package:') && !b.includes('dart:')) return -1;
            if (!a.includes('package:') && b.includes('package:') && !a.includes('dart:')) return 1;
            return a.localeCompare(b);
        });
    
    // 警告區塊
    const warningBlock = [
        '',
        '// ===== WARNING =====',
        '// Avoid modifying this section to prevent formatting issues.',
        '// ===== WARNING =====',
        ''
    ];
    
    // 排序路由常量
    const sortedConstants = parseResult.routeConstants.sort((a: string, b: string) => {
        const aName = a.match(/ROUTE_([A-Z_]+)/)?.[1] || '';
        const bName = b.match(/ROUTE_([A-Z_]+)/)?.[1] || '';
        return aName.localeCompare(bName);
    });
    
    // 排序路由處理器
    const sortedHandlers = parseResult.routeHandlers.sort((a: string, b: string) => {
        const aRoute = a.match(/case (ROUTE_[A-Z_]+):/)?.[1] || '';
        const bRoute = b.match(/case (ROUTE_[A-Z_]+):/)?.[1] || '';
        return aRoute.localeCompare(bRoute);
    });
    
    // 生成類頭部
    const classHeader = [
        'class RouteConfiguration {',
        '  /// ```dart',
        '  /// import \'package:flutter/material.dart\';',
        '  /// import \'route_configuration.dart\';',
        '',
        '  /// void main() {',
        '  ///   runApp(MyApp());',
        '  /// }',
        '',
        '  /// class MyApp extends StatelessWidget {',
        '  ///   @override',
        '  ///   Widget build(BuildContext context) {',
        '  ///     return MaterialApp(',
        '  ///       title: \'My App\'',
        '  ///       initialRoute: ROUTE_HOME,',
        '  ///       onGenerateRoute: RouteConfiguration.generateRoute,',
        '  ///     );',
        '  ///   }',
        '  /// }',
        '  ///```',
        '  static Route<dynamic> generateRoute(RouteSettings settings) {',
        '    switch (settings.name) {'
    ];
    
    // 生成默認處理器和類尾部
    const classFooter = parseResult.classFooter && parseResult.classFooter.length > 0
        ? parseResult.classFooter
        : [
            '      default:',
            '        return CupertinoPageRoute(',
            '          builder: (context) => Scaffold(',
            '            body: Center(',
            '              child: Text(\'No route defined for ${settings.name}\'),',
            '            ),',
            '          ),',
            '          settings: RouteSettings(name: settings.name),',
            '        );',
            '    }',
            '  }',
            '}'
        ];
    
    // 組合所有部分
    const allParts = [
        ...header,
        ...sortedImports,
        ...warningBlock,
        ...sortedConstants,
        ...warningBlock,
        ...classHeader,
        ...sortedHandlers,
        ...classFooter
    ];
    
    return allParts.join('\n');
}

function generateRouteHandler(routName: string, routeParam: string, widgetName: string, routeArg: string): string {
    const constantCase = changeCase.constantCase(routName);
    
    return `      case ROUTE_${constantCase}:
        final args = settings.arguments;
        ${routeArg} parsedArgs;

        if (args is ${routeArg}) {
          parsedArgs = args;
        } else if (args is Map<String, dynamic>) {
          parsedArgs = ${routeArg}.fromMap(args);
        } else {
          parsedArgs = const ${routeArg}();
        }

        return CupertinoPageRoute(
          builder: (context) => ${widgetName}(args: parsedArgs),
          settings: RouteSettings(name: settings.name),
        );`;
}

async function generateValidRoutesFile(filePath: string, routeNames: string[]) {
    const content = createValidRoutesContent(routeNames);
    await updateAndFormatFile(filePath, content);
}

async function updateValidRoutesFile(validRoutesFilePath: string, routeConfigFilePath: string) {
    // 從路由配置文件中提取所有路由名稱
    const routeConfigContent = readFileToText(routeConfigFilePath);
    const routeNames = extractRouteNames(routeConfigContent);
    
    const content = createValidRoutesContent(routeNames);
    await updateAndFormatFile(validRoutesFilePath, content,false);
}

function extractRouteNames(content: string): string[] {
  const routeNames: string[] = [];
  const regex = /const\s+String\s+(ROUTE_[A-Z_]+)\s*=/g;

  let match;
  while ((match = regex.exec(content)) !== null) {
    routeNames.push(match[1]);
  }

  return routeNames.sort();
}
// #region  建立內部路由驗證清單
function createValidRoutesContent(routeNames: string[]): string {
    const sortedRoutes = routeNames.sort();
    
    const routesList = sortedRoutes.map(route => `  ${route},`).join('\n');
    const path = `'package:${APP.flutterLibName}/route/${route_configuration_file_name}'`;
    return `// This file is auto-generated by generate_valid_routes.dart.
// Do not modify this file manually.

// Manual run "dart run tool/generate_valid_routes.dart" .

import ${path};

final List<String> validRoutes = [
${routesList}
];
`;
}

function createRouteConfiguration(routName: string, routeParam: string, importText: string, widgetName: string, mainClass: string, routeArg: string): string {
    const constantCase = changeCase.constantCase(routName);
    
    const routeTemplate = `// Auto-Generated File

// This file is auto-generated by a VSCode extension.

// - [Install Extension](https://marketplace.visualstudio.com/items?itemName=jackFan.lazy-jack)
// - [Read More](https://github.com/jack-fan1991/lazy-jack-flutter-extension/blob/HEAD/doc/clean_architecture.md)


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
  /// import \'package:flutter/material.dart\';
  /// import \'route_configuration.dart\';

  /// void main() {
  ///   runApp(MyApp());
  /// }

  /// class MyApp extends StatelessWidget {
  ///   @override
  ///   Widget build(BuildContext context) {
  ///     return MaterialApp(
  ///       title: \'My App\',
  ///       initialRoute: ROUTE_HOME,
  ///       onGenerateRoute: RouteConfiguration.generateRoute,
  ///     );
  ///   }
  /// }
  ///\`\`\`
  static Route<dynamic> generateRoute(RouteSettings settings) {
    switch (settings.name) {
      case ROUTE_${constantCase}:
        final args = settings.arguments;
        ${routeArg} parsedArgs;

        if (args is ${routeArg}) {
          parsedArgs = args;
        } else if (args is Map<String, dynamic>) {
          parsedArgs = ${routeArg}.fromMap(args);
        } else {
          parsedArgs = const ${routeArg}();
        }

        return CupertinoPageRoute(
          builder: (context) => ${widgetName}(args: parsedArgs),
          settings: RouteSettings(name: settings.name),
        );
      default:
        return CupertinoPageRoute(
          builder: (context) => Scaffold(
            body: Center(
              child: Text('No route defined for \${settings.name}'),
            ),
          ),
          settings: RouteSettings(name: settings.name),
        );
    }
  }
}
`;
    return routeTemplate;
}

function createPageArgsFile(): string {
    return `// Auto-Generated File

// This file is auto-generated by a VSCode extension.

// - [Install Extension](https://marketplace.visualstudio.com/items?itemName=jackFan.lazy-jack)
// - [Read More](https://github.com/jack-fan1991/lazy-jack-flutter-extension/blob/HEAD/doc/clean_architecture.md)

abstract class RouteArgs {
  final String routeName;
  const RouteArgs({required this.routeName});

  Future<dynamic> push() {
    throw UnimplementedError('push() not implemented');
  }

  Future<dynamic> pushReplacement() {
    throw UnimplementedError('pushReplacement() not implemented');
  }

  Future<dynamic> pushAndRemoveAll() {
    throw UnimplementedError('pushAndRemoveAll() not implemented');
  }
}
`;
}

export async function updateAndFormatFile(
    filePath: string,
    content: string,
    openInEditor: boolean = true, // 新增參數，預設打開
    revealText?: string
) {
    try {
        const fileUri = vscode.Uri.file(filePath);

        // 檢查文件是否存在，如果不存在就建立一個新的空文件
        try {
            await vscode.workspace.fs.stat(fileUri);
        } catch {
            const encoder = new TextEncoder();
            await vscode.workspace.fs.writeFile(fileUri, encoder.encode(''));
        }

        let document: vscode.TextDocument;

        if (vscode.workspace.textDocuments.some(doc => doc.uri.fsPath === filePath)) {
            document = vscode.workspace.textDocuments.find(doc => doc.uri.fsPath === filePath)!;
        } else {
            document = await vscode.workspace.openTextDocument(fileUri);
        }

        // 如果需要打開編輯器
        let editor: vscode.TextEditor | undefined;
        if (openInEditor) {
            editor = await vscode.window.showTextDocument(document);
        } else {
            // 如果不打開，可以使用 WorkspaceEdit 直接修改文件內容
            const edit = new vscode.WorkspaceEdit();
            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(document.getText().length)
            );
            edit.replace(fileUri, fullRange, content);
            await vscode.workspace.applyEdit(edit);
            await document.save();
        }

        // 如果有打開編輯器才做 edit 和 format
        if (editor) {
            await editor.edit(editBuilder => {
                const fullRange = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(document.getText().length)
                );
                editBuilder.replace(fullRange, content);
            });

            await document.save();

            await vscode.commands.executeCommand('editor.action.formatDocument');

            if (revealText) {
                await vscode.commands.executeCommand('editor.action.formatDocument');
                const text = document.getText();
                const offset = text.indexOf(revealText);
                if (offset !== -1) {
                    const startPosition = document.positionAt(offset);
                    const endPosition = document.positionAt(offset + revealText.length);
                    const range = new vscode.Range(startPosition, endPosition);
                    editor.selection = new vscode.Selection(range.start, range.end);
                    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
                }
            }
        }

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

function toUpperCamelCase(str: string): string {
    return str.replace(/(^\w|-\w)/g, clearAndUpper);
    function clearAndUpper(text: string) {
        return text.toUpperCase().replace('-', '');
    }
}

function changeCase_dotCase(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1.$2').toLowerCase();
}

export function registerRouteConfigurationWatcher(context: vscode.ExtensionContext) {
    let root = getRootPath();
    if (!root) {
        return;
    }
    const routeDir = path.join(root, 'lib', 'route');
    const routeConfigurationFlePath = path.join(routeDir, route_configuration_file_name);
    const validRoutesFilePath = path.join(routeDir, valid_routes_file_name);

    let debounceTimer: NodeJS.Timeout;

    const fileWatcher = vscode.workspace.createFileSystemWatcher(routeConfigurationFlePath);

    fileWatcher.onDidChange(async () => {
        await updateValidRoutesFile(validRoutesFilePath, routeConfigurationFlePath);
            vscode.commands.executeCommand('flutter.hotReload');
    });

    context.subscriptions.push(fileWatcher);
}