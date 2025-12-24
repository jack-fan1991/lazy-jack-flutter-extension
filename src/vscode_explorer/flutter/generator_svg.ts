import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as changeCase from "change-case";
import { openEditor } from '../../utils/src/vscode_utils/editor_utils';
import { reFormat } from '../../utils/src/vscode_utils/activate_editor_utils';
import { APP } from '../../extension';

const COMMAND_DART_ASSERT = "command_dart_assert";
const TARGET_PATH = "lib/assets";

interface FileInfo {
    absolutePath: string;
    relativePath: string;
    enumName: string;
}

export function registerGenerateAssert(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand(COMMAND_DART_ASSERT, async (folderUri) => {
            await generatorAssets(folderUri);
        })
    );
}

async function generatorAssets(folderUri: any) {
    const cwd = vscode.workspace.rootPath ?? "";
    if (!cwd) {
        vscode.window.showErrorMessage('無法找到工作區路徑');
        return;
    }

    // 1. 掃描所有檔案
    const allFiles = getFilesInDirectory(folderUri.path);
    const svgFiles = allFiles.filter(f => f.toLowerCase().endsWith('.svg'));
    const pngFiles = allFiles.filter(f => f.toLowerCase().endsWith('.png'));

    if (svgFiles.length === 0 && pngFiles.length === 0) {
        vscode.window.showWarningMessage('未找到任何 SVG 或 PNG 檔案');
        return;
    }

    // 2. 生成相對路徑基準
    const baseFolder = folderUri.path.replace(cwd, '').split('/').filter((x: string) => x !== "");
    
    // 3. 處理 SVG 檔案
    if (svgFiles.length > 0) {
        const svgFileInfos = generateFileInfos(svgFiles, folderUri.path, cwd);
        const svgConflicts = detectNameConflicts(svgFileInfos);
        
        if (svgConflicts.size > 0) {
            const shouldContinue = await handleConflicts(svgConflicts, 'SVG');
            if (!shouldContinue) {
                return;
            }
        }
        
        await generateEnumFile(svgFileInfos, baseFolder, cwd, 'svg');
    }

    // 4. 處理 PNG 檔案
    if (pngFiles.length > 0) {
        const pngFileInfos = generateFileInfos(pngFiles, folderUri.path, cwd);
        const pngConflicts = detectNameConflicts(pngFileInfos);
        
        if (pngConflicts.size > 0) {
            const shouldContinue = await handleConflicts(pngConflicts, 'PNG');
            if (!shouldContinue) {
                return;
            }
        }
        
        await generateEnumFile(pngFileInfos, baseFolder, cwd, 'png');
    }

    vscode.window.showInformationMessage(
        `✨ 生成完成！\n` +
        `SVG: ${svgFiles.length} 個\n` +
        `PNG: ${pngFiles.length} 個`
    );
}

function generateFileInfos(files: string[], basePath: string, cwd: string): FileInfo[] {
    return files.map(file => {
        // 計算相對於 assets 的路徑
        const relativePath = file.replace(cwd, '').replace(/^\//, '');
        
        // 生成 enum 名稱：從 assets 後面開始，移除副檔名
        const pathParts = relativePath.split('/');
        const assetsIndex = pathParts.indexOf('assets');
        
        let nameParts: string[];
        if (assetsIndex >= 0) {
            // 移除 'assets' 和檔案類型資料夾 (svg/png/images 等)
            nameParts = pathParts.slice(assetsIndex + 1);
            // 移除常見的類型資料夾名稱
            if (nameParts.length > 1 && ['svg', 'png', 'images', 'icons'].includes(nameParts[0].toLowerCase())) {
                nameParts = nameParts.slice(1);
            }
        } else {
            nameParts = pathParts;
        }
        
        // 移除副檔名並組合
        const fileName = nameParts[nameParts.length - 1].split('.')[0];
        nameParts[nameParts.length - 1] = fileName;
        
        // 組合路徑為名稱（用底線連接）
        let combinedName = nameParts.join('_');
        
        // 移除常見前綴
        combinedName = combinedName.replace(/^(icon_|svg_|img_|image_)/i, '');
        
        // 轉換為駝峰命名
        const enumName = changeCase.camelCase(combinedName);
        
        return {
            absolutePath: file,
            relativePath: relativePath,
            enumName: enumName
        };
    });
}

function detectNameConflicts(fileInfos: FileInfo[]): Map<string, FileInfo[]> {
    const nameMap = new Map<string, FileInfo[]>();
    
    fileInfos.forEach(info => {
        if (!nameMap.has(info.enumName)) {
            nameMap.set(info.enumName, []);
        }
        nameMap.get(info.enumName)!.push(info);
    });
    
    // 只保留有衝突的（多於一個檔案）
    const conflicts = new Map<string, FileInfo[]>();
    nameMap.forEach((files, name) => {
        if (files.length > 1) {
            conflicts.set(name, files);
        }
    });
    
    return conflicts;
}

async function handleConflicts(conflicts: Map<string, FileInfo[]>, fileType: string): Promise<boolean> {
    // 建立 QuickPick 項目
    const items = Array.from(conflicts.entries()).flatMap(([name, files]) =>
        files.map((file, index) => ({
            label: `$(warning) ${name}`,
            description: file.relativePath,
            detail: `衝突 ${index + 1}/${files.length}`,
            filePath: file.absolutePath
        }))
    );

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `偵測到 ${conflicts.size} 個 ${fileType} 檔案命名衝突，請選擇要重命名的檔案`,
        canPickMany: false,
        title: `${fileType} 檔案命名衝突`
    });

    if (selected) {
        await openFileAndRename(selected.filePath);
        vscode.window.showInformationMessage('請重命名檔案後，再次執行此指令');
        return false;
    }

    return false; // 使用者取消
}

async function openFileAndRename(filePath: string): Promise<void> {
    try {
        const fileUri = vscode.Uri.file(filePath);
        
        // 在檔案總管中顯示
        await vscode.commands.executeCommand('revealInExplorer', fileUri);
        
        // 等待 UI 更新
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 觸發重命名
        await vscode.commands.executeCommand('renameFile', fileUri);
        
    } catch (error) {
        vscode.window.showErrorMessage(`無法開啟檔案進行重命名: ${error}`);
    }
}

async function generateEnumFile(
    fileInfos: FileInfo[],
    baseFolder: string[],
    cwd: string,
    fileType: 'svg' | 'png'
): Promise<void> {
    // 生成檔案名稱：保留完整路徑包含 assets
    const folderName = baseFolder.join('_');
    
    const fileName = folderName 
        ? `${folderName}_${fileType}.lazy.dart`
        : `${fileType}.lazy.dart`;
    
    const assertPath = path.join(cwd, TARGET_PATH, fileName);

    // 讀取舊檔案獲取原本的數量
    let oldCount = 0;
    if (fs.existsSync(assertPath)) {
        try {
            const oldContent = fs.readFileSync(assertPath, 'utf-8');
            const enumPattern = fileType === 'svg' 
                ? /enum\s+SvgAssets\s+{([^}]*)}/
                : /enum\s+PngAssets\s+{([^}]*)}/;
            const match = oldContent.match(enumPattern);
            
            if (match) {
                const enumContent = match[1];
                // 只取分號之前的部分（enum 成員定義區）
                const membersSection = enumContent.split(';')[0];
                const memberPattern = /(\w+)\([^)]+\)/g;
                const members = membersSection.match(memberPattern);
                oldCount = members ? members.length : 0;
            }
        } catch (error) {
            console.log('Failed to read old file:', error);
        }
    }

    // 確保目錄存在
    const dir = path.dirname(assertPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // 生成 enum 成員
    const enumMembers = fileInfos.map(info => 
        `${info.enumName}('${info.relativePath}')`
    );

    // 產生程式碼
    let content: string;
    if (fileType === 'svg') {
        const hasVectorGraphics = APP.pubspecYaml?.["dependencies"]?.["vector_graphics"] !== undefined;
        content = hasVectorGraphics 
            ? svgVectorTemp(enumMembers)
            : svgTemp(enumMembers);
    } else {
        content = pngTemp(enumMembers);
    }

    // 寫入檔案
    fs.writeFileSync(assertPath, content);

    // 顯示數量變化訊息
    const newCount = fileInfos.length;
    let message: string;
    
    if (oldCount === 0) {
        message = `✨ ${fileType.toUpperCase()} 完成 (${newCount})`;
    } else {
        message = `✨ ${fileType.toUpperCase()} 完成 (${oldCount} -> ${newCount})`;
    }
    
    const action = await vscode.window.showInformationMessage(message, '查看檔案');
    
    if (action === '查看檔案') {
        await openEditor(assertPath);
        await reFormat();
    }
}

function getFilesInDirectory(directory: string, extension?: string): string[] {
    let result: string[] = [];

    const items = fs.readdirSync(directory);

    for (const item of items) {
        const fullPath = path.join(directory, item);
        const stat = fs.lstatSync(fullPath);

        if (stat.isDirectory()) {
            result = result.concat(getFilesInDirectory(fullPath, extension));
        } else if (stat.isFile()) {
            if (!extension || fullPath.toLowerCase().endsWith(extension)) {
                result.push(fullPath);
            }
        }
    }

    return result;
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
/// ⚠️ WARNING: This file is completely regenerated on each run.
/// DO NOT edit this file. Any manual changes will be lost.
enum SvgAssets {
  ${svgObj.join(',\n  ')};

  final String path;
  const SvgAssets(this.path);
    
  static SvgAssets fromPath(String path) {
    for (SvgAssets asset in SvgAssets.values) {
      if (asset.path == path) {
        return asset;
      }
    }
    throw ArgumentError('No SvgAssets found for the given path: \$path');
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
`;
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
/// ⚠️ WARNING: This file is completely regenerated on each run.
/// DO NOT edit this file. Any manual changes will be lost.
enum SvgAssets {
  ${svgObj.join(',\n  ')};

  final String path;
  const SvgAssets(this.path);

  static SvgAssets fromPath(String path) {
    for (SvgAssets asset in SvgAssets.values) {
      if (asset.path == path) {
        return asset;
      }
    }
    throw ArgumentError('No SvgAssets found for the given path: \$path');
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
`;
}

function pngTemp(pngObj: string[]) {
    return `import 'package:flutter/material.dart';

/// # Auto-Generated File
/// 
/// This file is auto-generated by a VSCode extension.
/// 
/// - [Install Extension](https://marketplace.visualstudio.com/items?itemName=jackFan.lazy-jack)
/// - [Read More](https://github.com/jack-fan1991/lazy-jack-flutter-extension/blob/main/doc/assets_creator.md)
/// 
/// ⚠️ WARNING: This file is completely regenerated on each run.
/// DO NOT edit this file. Any manual changes will be lost.
enum PngAssets {
  ${pngObj.join(',\n  ')};

  final String path;
  const PngAssets(this.path);

  static PngAssets fromPath(String path) {
    for (PngAssets asset in PngAssets.values) {
      if (asset.path == path) {
        return asset;
      }
    }
    throw ArgumentError('No PngAssets found for the given path: \$path');
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
`;
}