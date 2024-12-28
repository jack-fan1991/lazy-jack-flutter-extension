import * as vscode from 'vscode';

import { CompletionItemProvider, TextDocument, Position, CompletionItem, CompletionItemKind, CancellationToken } from 'vscode';
import { getActivateText } from '../utils/src/vscode_utils/activate_editor_utils';
import { getActivateEditorFileName, getActivateEditorFilePath, getCursorLineText, removeFolderPath } from '../utils/src/vscode_utils/editor_utils';
import { findClassRegex, toUpperCamelCase } from '../utils/src/regex/regex_utils';
import { activeEditorIsDart } from '../utils/src/language_utils/language_utils';
import path = require('path');
import { APP } from '../extension';
import * as changeCase from "change-case";
import { getRootPath } from '../utils/src/vscode_utils/vscode_env_utils';

const DART_MODE = { language: "dart", scheme: "file" };


export class MyCompletionItemProvider implements CompletionItemProvider {



    async provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken): Promise<CompletionItem[]> {
        const completionItems: CompletionItem[] = [];
        let text = getActivateText()
        let match = text.match(findClassRegex) ?? []
        let lineText = getCursorLineText();
        let fileName = getActivateEditorFileName()
        if (lineText?.startsWith('class ') || lineText?.startsWith('abstract class ')) {
            fileName = toUpperCamelCase(fileName)
            if (!lineText.includes(fileName) && (match.length == 0 || !Array.from(match).includes(fileName))) {
                completionItems.push(new CompletionItem(fileName, CompletionItemKind.Class));
            } else {
                let match = lineText.match(findClassRegex) ?? []
                let className = match[1]
                if (!lineText.includes('extends')) {
                    if (activeEditorIsDart()) {

                        completionItems.push(statelessItem(className));
                        completionItems.push(statefulWidgetItem(className))
                    }
                    completionItems.push(new CompletionItem('extends', CompletionItemKind.Class));
                } else if (lineText.includes("extends") && !lineText.includes("extends Cubit")) {
                    if (activeEditorIsDart() && APP.depOnBloc) {
                        completionItems.push(cubitItem(text))
                    }
                }
                else if ((lineText.includes("extends") && lineText.includes("extends Cubit")) || (lineText.includes("extends") && lineText.includes("extends Cubit<"))) {
                    let classDetails = await findClassesInCurrentFolder()
                    let classMatch: String[] = []
                    classDetails = classDetails.filter((e) => {
                        for (let i in e.classes) {
                            let typeName = e.classes[i]
                            let find = changeCase.camelCase(className)
                            let target = changeCase.camelCase(typeName)
                            if (is80PercentMatch(find, target) && className != typeName)
                                completionItems.push(cubitStateItem(lineText, text, className, typeName, e.file));
                            // classMatch.push(classN)
                        }
                    })
                } else if (!lineText.includes('State')) {
                    if (activeEditorIsDart()) {
                        completionItems.push(statelessItem(className, true));
                        completionItems.push(statefulWidgetItem(className, true))
                    }

                }


            }
        }
        return completionItems;
    }
}

function statefulWidgetItem(className: string, fromWidget: boolean = false): CompletionItem {
    // 添加自动补全项
    const nameItem = new CompletionItem('StatefulWidget', CompletionItemKind.Class);
    let prefix = fromWidget ? "" : "extends "
    nameItem.insertText = new vscode.SnippetString(
        `${prefix}StatefulWidget {\n` +
        `  const ${className}({super.key});\n\n` +
        `  @override\n` +
        `  State<${className}> createState() => _${className}State();\n` +
        `}\n\n` +
        `class _${className}State extends State<${className}> {\n` +
        `  @override\n` +
        `  Widget build(BuildContext context) {\n` +
        `    return Container();\n` +
        `  }\n` +
        `}`
    );
    return nameItem;
}

function is80PercentMatch(str1: string, str2: string): boolean {
    const minLength = Math.min(str1.length, str2.length);
    const threshold = Math.floor(minLength * 0.5);  // 80% 的字符数
    let matchCount = 0;

    // 比较前80%字符
    for (let i = 0; i < threshold; i++) {
        if (str1[i] === str2[i]) {
            matchCount++;
        }
    }

    // 如果相同字符的数量大于等于80%字符的数量，认为是80%匹配
    return matchCount >= threshold;
}

function statelessItem(className: string, fromWidget: boolean = false): CompletionItem {
    // 添加自动补全项
    let prefix = fromWidget ? "" : "extends "
    const nameItem = new CompletionItem('StatelessWidget', CompletionItemKind.Class);
    nameItem.insertText = new vscode.SnippetString(
        `${prefix}StatelessWidget {\n` +
        `  const ${className}({super.key});\n\n` +
        '  @override\n' +
        '  Widget build(BuildContext context) {\n' +
        '    return Container();\n' +
        '  }\n' +
        '}'
    );
    return nameItem;
}


function cubitStateItem(lineText: String, text: String, className: String, typeName: String, filePath: String): CompletionItem {
    // let classDetails = (await findClassesInCurrentFolder()).filter((e) => e.classes.);
    let editor = vscode.window.activeTextEditor!
    let p = filePath.replace(getRootPath(), "")

    const position = editor.selection.active;
    const nameItem = new CompletionItem(`${typeName}`, CompletionItemKind.Class);

    if (lineText.includes("{") && lineText.includes(">")) {
        if(lineText.includes("<")){
            nameItem.insertText = new vscode.SnippetString(
                `${typeName}`)
        }else{
            nameItem.insertText = new vscode.SnippetString(
                `<${typeName}`)
        }
       

    } else if (lineText.includes("{") && !lineText.includes(">")) {
        if(lineText.includes("<")){
            nameItem.insertText = new vscode.SnippetString(
                `${typeName}>`)
        }else{
            nameItem.insertText = new vscode.SnippetString(
                `<${typeName}>`)
        }
       
    }
   

    else {
        nameItem.insertText = new vscode.SnippetString(
            `<${typeName}>{
\t${className}(super.initialState);
}`
        );
    }


    nameItem.range = new vscode.Range(
        new Position(position.line, position.character),  // 開始位置
        new Position(position.line, position.character - 1)   // 結束位置
    );
    nameItem.detail = `${p}`
    nameItem.documentation = `
class ${className} extends Cubit<${typeName}>{
    ${className}(super.initialState);
}  
`
    let textEditList: vscode.TextEdit[] = [];
    if (!text.includes("import 'package:bloc/bloc.dart';")) {
        textEditList.push({
            range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0)),
            newText: "import 'package:bloc/bloc.dart';\n"
        })
    }
    p = p.replace("/lib", "")
    let packageImport = `package:${APP.flutterPackageName}${p}`
    if (!text.includes(packageImport)) {
        textEditList.push({
            range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0)),
            newText: `import "${packageImport}";\n`
        })
    }
    nameItem.additionalTextEdits = textEditList
    nameItem.label = `${typeName}`;
    return nameItem;
}

function cubitItem(text: String): CompletionItem {
    // let classDetails = (await findClassesInCurrentFolder()).filter((e) => e.classes.);

    const nameItem = new CompletionItem('Cubit', CompletionItemKind.Class);
    nameItem.insertText = new vscode.SnippetString(
        "Cubit"
    );
    if (!text.includes("import 'package:bloc/bloc.dart';")) {
        nameItem.additionalTextEdits = [
            {
                range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0)),
                newText: "import 'package:bloc/bloc.dart';\n"
            }
        ];

    }
    // nameItem.additionalTextEdits = [
    //     {
    //         range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0)),
    //         newText: "import 'package:bloc/bloc.dart';\n"
    //     }
    // ];
    // 增加額外的命令來插入下一個補全項目
    // 假設 nextCubitItem 會創建下一個補全項目    
    return nameItem;
}


export function registerCompletionItemProvider(context: vscode.ExtensionContext) {
    const myCompletionItemProvider = new MyCompletionItemProvider();

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            DART_MODE,
            myCompletionItemProvider,
            ' ',
        )
    );
}

export interface SnippetSetting {
    prefix: string;
    body: string[];
    description: string;
}

const completionItem = (snippet: SnippetSetting) => {
    const item = new vscode.CompletionItem(snippet.prefix);
    item.insertText = new vscode.SnippetString(snippet.body.join('\n'));
    item.documentation = snippet.description;
    return item;
}

// 查找与 className 匹配的 state 文件
async function findMatchingStateFiles(className: string): Promise<vscode.Uri[]> {
    // 搜索与 className 相关的文件
    const findPath = await vscode.workspace.findFiles(`**/lib/**/*${className.toLowerCase()}*.dart`);
    return findPath.filter(uri => uri.path.includes(`${className.toLowerCase()}_state`));
}


class ClassDetails {
    file: string;
    classes: string[];
    constructor(file: string, classes: string[]) {
        this.file = file;
        this.classes = classes;
    }
}


// 示例：获取当前文件夹的所有 .dart 文件并提取类名
async function findClassesInCurrentFolder(): Promise<ClassDetails[]> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage('No active editor found.');
        return [];
    }

    const document = editor.document;
    const folderPath = vscode.workspace.asRelativePath(document.uri).split('/').slice(0, -1).join('/'); // 获取当前文件的文件夹路径

    const dartFiles = await getAllDartFilesInFolder(folderPath);

    if (dartFiles.length === 0) {
        return []
    }

    // 解析所有文件中的类名
    const classDetails = await getClassesFromFiles(dartFiles);
    return classDetails

}


// 获取当前目录中的所有 .dart 文件（排除 .g.dart 和 .freezed.dart 文件）
async function getAllDartFilesInFolder(folderPath: string): Promise<vscode.Uri[]> {
    // 搜索该文件夹中的所有 .dart 文件，排除 .g.dart 和 .freezed.dart 文件
    let absPath = getActivateEditorFilePath()
    let absDir = path.dirname(absPath)
    const files = await vscode.workspace.findFiles(
        new vscode.RelativePattern(absDir, '**/*.dart')
    );

    // 过滤掉 .g.dart 和 .freezed.dart 文件
    const filteredFiles = files.filter(file =>
        !file.path.endsWith('.g.dart') && !file.path.endsWith('.freezed.dart')
    );

    return filteredFiles;
}


// 读取文件内容并解析出类名
async function getClassesFromFiles(files: vscode.Uri[]): Promise<{ file: string, classes: string[] }[]> {
    const result: ClassDetails[] = [];
    for (const file of files) {
        const document = await vscode.workspace.openTextDocument(file);
        const text = document.getText();

        // 解析类名
        const classNames = extractClassesFromText(text);

        if (classNames.length > 0) {
            let classDetails = new ClassDetails(file.fsPath, classNames);
            result.push(classDetails);
        }
    }
    return result;
}

// 解析 Dart 文件中的所有类名，包括泛型类
function extractClassesFromText(text: string): string[] {
    // 匹配 class 的正则表达式，支持泛型类（例如：class User<wer, qwe>）
    const classRegex = /class\s+([A-Za-z0-9_]+(?:<[^>]+>)?)/g;
    const classNames: string[] = [];
    let match;

    // 查找所有的 class 定义
    while ((match = classRegex.exec(text)) !== null) {
        classNames.push(match[1]);
    }

    return classNames;
}