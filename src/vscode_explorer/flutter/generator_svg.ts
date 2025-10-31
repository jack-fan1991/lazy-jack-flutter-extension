import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
// explorer/context
const command_dart_assert = "command_dart_assert"
import * as changeCase from "change-case";
import { openEditor } from '../../utils/src/vscode_utils/editor_utils';
import { runCommand } from '../../utils/src/terminal_utils/terminal_utils';
import { reFormat } from '../../utils/src/vscode_utils/activate_editor_utils';
import { APP } from '../../extension';


export function registerGenerateAssert(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(command_dart_assert, async (folderUri) => {
        generatorSvg(folderUri)
        generatorPng(folderUri)
    }));
}

async function generatorSvg(folderUri: any) {
    let hasVectorGraphics = APP.pubspecYaml["dependencies"]["vector_graphics"] !=undefined
    const findPath = await vscode.workspace.findFiles('**/lib/**/*svg.lazy.dart');
    let targetPath = "lib/assets"
    const cwd = vscode.workspace.rootPath ?? "";
    
    const files = getFilesInDirectory(folderUri.path, '.svg');
    if(files.length==0) return
    let svgFolder = folderUri.path.replace(cwd, '').split('/').filter((x: string) => x != "").join('/')

    let fileName = svgFolder.split('/').filter((x: string) => x != "").join('_')
    const assertPath = path.join(cwd, `${targetPath}/${fileName}_svg.lazy.dart`);
    let isNew: boolean = false;
    const fileUri = vscode.Uri.file(assertPath);
    let document: vscode.TextDocument;
    try {
        // 檢查目錄是否存在，若不存在則創建
        if (!fs.existsSync(folderUri.path)) {
            await vscode.workspace.fs.createDirectory(folderUri);
         
        }

        // 檢查文件是否存在，若不存在則創建
        if (!fs.existsSync(assertPath)) {
            const content = new TextEncoder().encode("enum SvgAssets{} ");
            await vscode.workspace.fs.writeFile(fileUri, content);
            isNew = true
        }

         document = await vscode.workspace.openTextDocument(fileUri);
    } catch (error) {
        vscode.window.showErrorMessage(`Error opening file: ${error}`);
        return undefined;
    }
    let editor: vscode.TextEditor | undefined = await openEditor(assertPath)
    editor?.document.save();
    if (!editor) {
        return
    }
    let text = editor.document.getText()
    let match = text.match(RegExp(/enum\s+SvgAssets\s+{([\s\S]*?)\}/))

    // 从匹配结果中提取枚举成员和图标文件名
    let members: string[][] = []
    let newIcon: string[] = []
    let icon: string[]
    if (!isNew) {
        const enumContent = match![1];
        members = enumContent
            .split(/[\r\n]+/) // 按行分割
            .map((line) => line.trim()) // 去掉行首行尾的空白
            .filter((line) => line !== '') // 过滤空行
            .map((line) => line.match(/^(\w+)\('(.*)'\),?$/)) // 提取成员和文件名
            .filter((match) => match !== null) // 过滤不匹配的行
            .map((match) => match!.slice(1, 3)); //
        icon = files.map(item => {
            let currentName = members.filter(([_, path]) => path.replace(`${svgFolder}/`, '') === item)[0]
            if (currentName != null) {
                return `${currentName[0]}('${currentName[1]}')`;
            }
            let fileName = item.split("assets")[1].split('.')[0].replace(/\//g, "_").replace(/^_/, '')
            let path =item.split("assets")[1]
            // 转换为驼峰命名
            let funcName = changeCase.camelCase(fileName)
            if(funcName.startsWith("svg")){
                funcName= funcName.replace("svg","")
            }
            if(funcName.startsWith("images")){
                funcName= funcName.replace("images","")
            }
            // 返回格式化后的字符串
            let result = `${changeCase.camelCase(funcName)}('assets${path}')`;
            if (!enumContent.includes(result)) {
                newIcon.push(result)
            }
            return result;
        });
    } else {
        icon = files.map(item => {
            let fileName = item.split("assets")[1].split('.')[0].replace(/\//g, "_").replace(/^_/, '')
            let path =item.split("assets")[1]
            // const fileName = changeCase.snakeCase(item.split('.')[0])
            // 转换为驼峰命名
            let funcName = changeCase.camelCase(fileName.replace('icon_', ''))
            if(funcName.startsWith("svg")){
                funcName=  funcName.replace("svg","")
            }
            if(funcName.startsWith("images")){
                funcName= funcName.replace("images","")
            }
            let result = `${changeCase.camelCase(funcName)}('assets${path}')`;
            newIcon.push(result)
            return result;
        });
    }
    vscode.window.showInformationMessage(``)
    vscode.window.showInformationMessage(`新增${newIcon.length}個svg\n${newIcon.join(',\n\t')}`)
    if(hasVectorGraphics){
        fs.writeFileSync(assertPath, svgVectorTemp(icon));
    }else{
        fs.writeFileSync(assertPath, svgTemp(icon));
    }
    if (newIcon.length > 0) {
        openEditor(assertPath)
    }
}

function getFilesInDirectory(directory: string, extension: string): string[] {
    let result: string[] = [];

    // 讀取目錄中的項目
    const items = fs.readdirSync(directory);

    for (const item of items) {
        const fullPath = path.join(directory, item);
        const stat = fs.lstatSync(fullPath);

        if (stat.isDirectory()) {
            // 如果是資料夾，則遞迴搜尋
            result = result.concat(getFilesInDirectory(fullPath, extension));
        } else if (stat.isFile() && fullPath.toLowerCase().endsWith(extension)) {
            // 如果是檔案且符合副檔名條件，則加入結果
            result.push(fullPath);
        }
    }

    return result;
}

async function generatorPng(folderUri: any) {
    const findPath = await vscode.workspace.findFiles('**/lib/**/*png.lazy.dart');
    let targetPath = "lib/assets"
    const cwd = vscode.workspace.rootPath ?? "";
    const files = getFilesInDirectory(folderUri.path, '.png');
    if(files.length==0) return
    let svgFolder = folderUri.path.replace(cwd, '').split('/').filter((x: string) => x != "").join('/')
    let fileName = svgFolder.split('/').filter((x: string) => x != "").join('_')
    const assertPath = path.join(cwd, `${targetPath}/${fileName}_png.lazy.dart`);
    let isNew: boolean = false;
    if (!fs.existsSync(assertPath)) {
        isNew = true
        runCommand(`mkdir -p ${targetPath}`)
        fs.writeFileSync(assertPath, "enum PngAssets{} ");
    }
    let editor: vscode.TextEditor | undefined = await openEditor(assertPath)
    editor?.document.save();
    if (!editor) {
        return
    }
    let text = editor.document.getText()
    let match = text.match(RegExp(/enum\s+PngAssets\s+{([\s\S]*?)\}/))

    // 从匹配结果中提取枚举成员和图标文件名
    let members: string[][] = []
    let newIcon: string[] = []
    let icon: string[]
    if (!isNew) {
        const enumContent = match![1];
        members = enumContent
            .split(/[\r\n]+/) // 按行分割
            .map((line) => line.trim()) // 去掉行首行尾的空白
            .filter((line) => line !== '') // 过滤空行
            .map((line) => line.match(/^(\w+)\('(.*)'\),?$/)) // 提取成员和文件名
            .filter((match) => match !== null) // 过滤不匹配的行
            .map((match) => match!.slice(1, 3)); //
        icon = files.map(item => {
            let currentName = members.filter(([_, path]) => path.replace(`${svgFolder}/`, '') === item)[0]
            if (currentName != null) {
                return `${currentName[0]}('${currentName[1]}')`;
            }
            let fileName = item.split("assets")[1].split('.')[0].replace(/\//g, "_").replace(/^_/, '')
            let path =item.split("assets")[1]
            // 转换为驼峰命名
            let funcName = changeCase.camelCase(fileName)
            if(funcName.startsWith("images")){
                funcName= funcName.replace("images","")
            }
            let result = `${changeCase.camelCase(funcName)}('assets${path}')`;
            if (!enumContent.includes(result)) {
                newIcon.push(result)
            }
            return result;
        });
    } else {
        icon = files.map(item => {
            let fileName = item.split("assets")[1].split('.')[0].replace(/\//g, "_").replace(/^_/, '')
            let path =item.split("assets")[1]
         
            let funcName = changeCase.camelCase(fileName)
            if(funcName.startsWith("images")){
                funcName= funcName.replace("images","")
            }
            let result = `${changeCase.camelCase(funcName)}('assets${path}')`;
            newIcon.push(result)
            return result;
        });
    }
    vscode.window.showInformationMessage(``)
    vscode.window.showInformationMessage(`新增${newIcon.length}個png\n${newIcon.join(',\n\t')}`)
    fs.writeFileSync(assertPath, pngTemp(icon));
    if (newIcon.length > 0) {
        openEditor(assertPath)
    }
    reFormat()

}

function svgVectorTemp(svgObj: string[]) {
    return `import 'package:flutter/material.dart';
import 'package:vector_graphics/vector_graphics.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// # Auto-Generated File
/// 
/// This file is auto-generated by a VSCode extension.
/// 
/// - [Install Extension](https://marketplace.visualstudio.com/items?itemName=jackFan.lazy-jack)
/// - [Read More](https://github.com/jack-fan1991/lazy-jack-flutter-extension/blob/main/doc/assets_creator.md)
/// 
/// Please do not edit this file directly, as it will be overwritten when regenerated.
/// To make changes, use the right-click context menu in VSCode to regenerate this file.
enum SvgAssets {
  ${svgObj.join(',\n\t')};

  final String path;
  const SvgAssets(this.path);
    
    static SvgAssets fromPath(String path) {
      for (SvgAssets asset in SvgAssets.values) {
        if (asset.path == path) {
          return asset;
       }
      }
      throw ArgumentError('No SvgAssets found for the given path: $path');
    }

    Widget toSvgWidget({double? width, double? height, Color? color}) =>
      SvgPicture.asset(
        path,
        width: width,
        height: height,
        colorFilter: color == null
            ? null
            : ColorFilter.mode(
                color,
                BlendMode.srcIn,
        ),
    );

    Widget toVectorGraphicsWidget({
        double? width,
        double? height,
        Color? color,
        BoxFit fit = BoxFit.contain, 
        Alignment alignment = Alignment.center,
        Clip clipBehavior = Clip.hardEdge,
        String? semanticsLabel, 
    }) =>
        VectorGraphic(
            loader: AssetBytesLoader(path),
            width: width,
            height: height,
            fit: fit,
            alignment: alignment,
            clipBehavior: clipBehavior,
            semanticsLabel: semanticsLabel,
            colorFilter: color == null
                ? null
                : ColorFilter.mode(
                    color,
                    BlendMode.srcIn,
                ),
        );

}
`
}


function svgTemp(svgObj: string[]) {
    return `import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';


/// # Auto-Generated File
/// 
/// This file is auto-generated by a VSCode extension.
/// 
/// - [Install Extension](https://marketplace.visualstudio.com/items?itemName=jackFan.lazy-jack)
/// - [Read More](https://github.com/jack-fan1991/lazy-jack-flutter-extension/blob/main/doc/assets_creator.md)
/// 
/// Please do not edit this file directly, as it will be overwritten when regenerated.
/// To make changes, use the right-click context menu in VSCode to regenerate this file.
enum SvgAssets {
  ${svgObj.join(',\n\t')};

  final String path;
  const SvgAssets(this.path);

    static SvgAssets fromPath(String path) {
      for (SvgAssets asset in SvgAssets.values) {
        if (asset.path == path) {
          return asset;
       }
      }
      throw ArgumentError('No SvgAssets found for the given path: $path');
    }

    Widget toSvgWidget({double? width, double? height, Color? color}) =>
      SvgPicture.asset(
        path,
        width: width,
        height: height,
        colorFilter: color == null
            ? null
            : ColorFilter.mode(
                color,
                BlendMode.srcIn,
        ),
    );
}
`
}


function pngTemp(svgObj: string[]) {
    return `import 'package:flutter/material.dart';

/// # Auto-Generated File
/// 
/// This file is auto-generated by a VSCode extension.
/// 
/// - [Install Extension](https://marketplace.visualstudio.com/items?itemName=jackFan.lazy-jack)
/// - [Read More](https://github.com/jack-fan1991/lazy-jack-flutter-extension/blob/main/doc/assets_creator.md)
/// 
/// Please do not edit this file directly, as it will be overwritten when regenerated.
/// To make changes, use the right-click context menu in VSCode to regenerate this file.
enum PngAssets {
  ${svgObj.join(',\n\t')};

  final String path;
  const PngAssets(this.path);

  static PngAssets fromPath(String path) {
    for (PngAssets asset in PngAssets.values) {
      if (asset.path == path) {
        return asset;
      }
    }
    throw ArgumentError('No PngAssets found for the given path: $path');
  }
  
  Widget toImage({
    double? width,
    double? height,
    Color? color,
    ImageFrameBuilder? frameBuilder,
    ImageErrorWidgetBuilder? errorBuilder,
    String? semanticLabel,
    bool excludeFromSemantics = false,
    double? scale,
    BlendMode? colorBlendMode,
    BoxFit? fit,
    AlignmentGeometry alignment = Alignment.center,
    ImageRepeat repeat = ImageRepeat.noRepeat,
    Rect? centerSlice,
    bool matchTextDirection = false,
    bool gaplessPlayback = false,
    bool isAntiAlias = false,
    String? package,
    FilterQuality filterQuality = FilterQuality.low,
    int? cacheWidth,
    int? cacheHeight,
  }) =>
      Image.asset(
        path,
        width: width,
        height: height,
        color: color,
        frameBuilder: frameBuilder,
        errorBuilder: errorBuilder,
        semanticLabel: semanticLabel,
        excludeFromSemantics: excludeFromSemantics,
        scale: scale,
        colorBlendMode: colorBlendMode,
        fit: fit,
        alignment: alignment,
        repeat: repeat,
        centerSlice: centerSlice,
        matchTextDirection: matchTextDirection,
        gaplessPlayback: gaplessPlayback,
        isAntiAlias: isAntiAlias,
        package: package,
        filterQuality: filterQuality,
        cacheWidth: cacheWidth,
        cacheHeight: cacheHeight,
      );
}
`
}