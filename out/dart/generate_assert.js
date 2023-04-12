"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerGenerateAssert = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const common_1 = require("../utils/common");
const command_dart_assert = "command_dart_assert";
const changeCase = require("change-case");
function registerGenerateAssert(context) {
    context.subscriptions.push(vscode.commands.registerCommand(command_dart_assert, (folderUri) => __awaiter(this, void 0, void 0, function* () {
        generatorSvg(folderUri);
        generatorPng(folderUri);
    })));
}
exports.registerGenerateAssert = registerGenerateAssert;
function generatorSvg(folderUri) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const cwd = (_a = vscode.workspace.rootPath) !== null && _a !== void 0 ? _a : "";
        const files = fs.readdirSync(folderUri.path).filter((x) => x.toLowerCase().includes('.svg'));
        let svgFolder = folderUri.path.replace(cwd, '').split('/').filter((x) => x != "").join('/');
        let fileName = svgFolder.split('/').filter((x) => x != "").join('_');
        const assertPath = path.join(cwd, `lib/const/${fileName}_svg.lazyjack.dart`);
        let isNew = false;
        if (!fs.existsSync(assertPath)) {
            isNew = true;
            fs.writeFileSync(assertPath, "enum SvgIcon{} ");
        }
        let editor = yield (0, common_1.openEditor)(assertPath);
        editor === null || editor === void 0 ? void 0 : editor.document.save();
        if (!editor) {
            return;
        }
        let text = editor.document.getText();
        let match = text.match(RegExp(/enum\s+SvgIcon\s+{([\s\S]*?)\}/));
        // 从匹配结果中提取枚举成员和图标文件名
        let members = [];
        let newIcon = [];
        let icon;
        if (!isNew) {
            const enumContent = match[1];
            members = enumContent
                .split(/[\r\n]+/) // 按行分割
                .map((line) => line.trim()) // 去掉行首行尾的空白
                .filter((line) => line !== '') // 过滤空行
                .map((line) => line.match(/^(\w+)\('(.*)'\),?$/)) // 提取成员和文件名
                .filter((match) => match !== null) // 过滤不匹配的行
                .map((match) => match.slice(1, 3)); //
            icon = files.map(item => {
                let currentName = members.filter(([_, path]) => path.replace(`${svgFolder}/`, '') === item)[0];
                if (currentName != null) {
                    return `${currentName[0]}('${currentName[1]}')`;
                }
                // 获取文件名
                const fileName = changeCase.snakeCase(item.split('.')[0]);
                // 转换为驼峰命名
                const funcName = changeCase.camelCase(fileName.replace('icon_', ''));
                // 返回格式化后的字符串
                let result = `${funcName}('${svgFolder}/${item}')`;
                if (!enumContent.includes(result)) {
                    newIcon.push(result);
                }
                return result;
            });
        }
        else {
            icon = files.map(item => {
                // 获取文件名
                const fileName = changeCase.snakeCase(item.split('.')[0]);
                // 转换为驼峰命名
                const funcName = changeCase.camelCase(fileName.replace('icon_', ''));
                // 返回格式化后的字符串
                let result = `${funcName}('${svgFolder}/${item}')`;
                newIcon.push(result);
                return result;
            });
        }
        vscode.window.showInformationMessage(``);
        vscode.window.showInformationMessage(`新增${newIcon.length}個svg\n${newIcon.join(',\n\t')}`);
        fs.writeFileSync(assertPath, svgTemp(icon));
        (0, common_1.openEditor)(assertPath);
    });
}
function generatorPng(folderUri) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const cwd = (_a = vscode.workspace.rootPath) !== null && _a !== void 0 ? _a : "";
        const files = fs.readdirSync(folderUri.path).filter((x) => x.toLowerCase().includes('.png'));
        let svgFolder = folderUri.path.replace(cwd, '').split('/').filter((x) => x != "").join('/');
        let fileName = svgFolder.split('/').filter((x) => x != "").join('_');
        const assertPath = path.join(cwd, `lib/const/${fileName}_png.lazyjack.dart`);
        let isNew = false;
        if (!fs.existsSync(assertPath)) {
            isNew = true;
            fs.writeFileSync(assertPath, "enum PngImage{} ");
        }
        let editor = yield (0, common_1.openEditor)(assertPath);
        editor === null || editor === void 0 ? void 0 : editor.document.save();
        if (!editor) {
            return;
        }
        let text = editor.document.getText();
        let match = text.match(RegExp(/enum\s+PngImage\s+{([\s\S]*?)\}/));
        // 从匹配结果中提取枚举成员和图标文件名
        let members = [];
        let newIcon = [];
        let icon;
        if (!isNew) {
            const enumContent = match[1];
            members = enumContent
                .split(/[\r\n]+/) // 按行分割
                .map((line) => line.trim()) // 去掉行首行尾的空白
                .filter((line) => line !== '') // 过滤空行
                .map((line) => line.match(/^(\w+)\('(.*)'\),?$/)) // 提取成员和文件名
                .filter((match) => match !== null) // 过滤不匹配的行
                .map((match) => match.slice(1, 3)); //
            icon = files.map(item => {
                let currentName = members.filter(([_, path]) => path.replace(`${svgFolder}/`, '') === item)[0];
                if (currentName != null) {
                    return `${currentName[0]}('${currentName[1]}')`;
                }
                // 获取文件名
                const fileName = changeCase.snakeCase(item.split('.')[0]);
                // 转换为驼峰命名
                const funcName = changeCase.camelCase(fileName);
                // 返回格式化后的字符串
                let result = `${funcName}('${svgFolder}/${item}')`;
                if (!enumContent.includes(result)) {
                    newIcon.push(result);
                }
                return result;
            });
        }
        else {
            icon = files.map(item => {
                // 获取文件名
                const fileName = changeCase.snakeCase(item.split('.')[0]);
                // 转换为驼峰命名
                const funcName = changeCase.camelCase(fileName);
                // 返回格式化后的字符串
                let result = `${funcName}('${svgFolder}/${item}')`;
                newIcon.push(result);
                return result;
            });
        }
        vscode.window.showInformationMessage(``);
        vscode.window.showInformationMessage(`新增${newIcon.length}個png\n${newIcon.join(',\n\t')}`);
        fs.writeFileSync(assertPath, pngTemp(icon));
        (0, common_1.openEditor)(assertPath);
    });
}
function svgTemp(svgObj) {
    return `import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
enum SvgIcon {
  ${svgObj.join(',\n\t')};

  final String path;
  const SvgIcon(this.path);

  Widget toIcon({double? width, double? height,Color? color}) => SvgPicture.asset(
    path,
    width: width,
    height: height,
    color:color
  );
}
`;
}
function pngTemp(svgObj) {
    return `import 'package:flutter/material.dart';
  
enum PngImage {
  ${svgObj.join(',\n\t')};

  final String path;
  const PngImage(this.path);
  
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
//# sourceMappingURL=generate_assert.js.map