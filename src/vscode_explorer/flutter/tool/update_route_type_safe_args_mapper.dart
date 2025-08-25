import 'dart:io';

void main() async {
  const pageArgsPath = 'lib/route/page_args.dart';
  const routeConfigurationPath = 'lib/route/route_configuration.dart';
  const routeArgMapperPath =
      'lib/navigator/domain/route_resolver/route_arg_mapper.dart';
  const libDirPath = 'lib';

  // 取得 PageArgs 抽象類別名稱
  final pageArgsContent = await File(pageArgsPath).readAsString();
  final pageArgsClassName =
      RegExp(r'abstract class (\w+)').firstMatch(pageArgsContent)?.group(1);

  if (pageArgsClassName == null) {
    print('❌ 找不到 PageArgs 抽象類別');
    exit(1);
  }

  // 尋找所有 PageArgs 子類別
  final pageArgsSubclasses = <String, File>{};

  final libDir = Directory(libDirPath);
  await for (final entity in libDir.list(recursive: true)) {
    if (entity is File && entity.path.endsWith('.dart')) {
      final content = await entity.readAsString();

      final directMatches = RegExp(r'class (\w+) extends ' + pageArgsClassName)
          .allMatches(content);
      for (final match in directMatches) {
        final subclass = match.group(1);
        if (subclass != null) {
          pageArgsSubclasses[subclass] = entity;
          print('找到子類別: $subclass 在 ${entity.path}');
        }
      }
    }
  }

  if (pageArgsSubclasses.isEmpty) {
    print('⚠️ 沒有找到任何 $pageArgsClassName 的子類別');
    exit(0);
  }

  // 讀取 route_arg_mapper.dart 檔案內容
  final routeFile = File(routeArgMapperPath);
  String originalContent = await routeFile.readAsString();

  // 讀取 route_configuration.dart 檔案內容
  final routeConfigurationFile = File(routeConfigurationPath);
  String originalRouteConfiguration =
      await routeConfigurationFile.readAsString();

  // 找出 switch 區塊
  final switchStart = originalContent.indexOf('switch (route) {');
  final switchEnd = originalContent.indexOf('};', switchStart);
  final switchDefault = originalContent.indexOf('_ =>', switchStart);
  if (switchStart == -1 || switchEnd == -1) {
    print('❌ 找不到 switch (route) 區塊');
    exit(1);
  }

  final switchBody = originalContent.substring(switchStart, switchEnd);

  // 根據 subArgClass 對應出 widget class 名稱

  final missingImplementations = <String, String>{}; // subclass -> ROUTE_XXX
  for (final argSubclass in pageArgsSubclasses.keys) {
    final file = pageArgsSubclasses[argSubclass];
    String widgetContent = await file!.readAsString();
    final mainWidgetClass = _extractWidgetClassFromArgsContent(widgetContent);
    final routeConstName = _findRouteConstFromRouteConfig(
      widgetClass: mainWidgetClass!,
      routeConfigContent: originalRouteConfiguration,
    );

    if (routeConstName == null) {
      print('⚠️ 找不到 $argSubclass 對應的 route 常數');
      continue;
    }

    final pattern = RegExp(r'=>\s*' + argSubclass + r'\(');
    if (!pattern.hasMatch(switchBody)) {
      missingImplementations[argSubclass] = routeConstName;
    }
  }

  if (missingImplementations.isEmpty) {
    print('✅ 所有 $pageArgsClassName 子類別都已實作對應邏輯。');
    return;
  }
  print('-' * 40);
  print('🛠 準備補上以下對應：');
  for (final entry in missingImplementations.entries) {
    print('- ${entry.key} → ${entry.value}');
    print('path: ${pageArgsSubclasses[entry.key]!.path}');
  }
  print('-' * 40);

  // 建立新增內容
  final newCases = missingImplementations.entries.map((entry) {
    final subclass = entry.key;
    final routeConst = entry.value;
    return '    $routeConst => $subclass(),';
  }).join('\n');

  // 插入到 switch 區塊結尾前
  final updatedContent = originalContent.replaceRange(
    switchDefault,
    switchDefault,
    '\n$newCases\n',
  );

  await routeFile.writeAsString(updatedContent);

  print('✅ 已成功補上缺漏的 switch-case。');
  print('✅ 請檢查 $routeArgMapperPath 檔案。');
}

String? _extractWidgetClassFromArgsContent(String argsClassContent) {
  final match =
      RegExp(r'routeName\s*:\s*(\w+)\.routeName').firstMatch(argsClassContent);
  return match?.group(1); // 例如 WebViewScreenWidget
}

String? _findRouteConstFromRouteConfig({
  required String widgetClass,
  required String routeConfigContent,
}) {
  final pattern = RegExp(
    r'const String (\w+)\s*=\s*' + widgetClass + r'\s*\.\s*routeName\s*;',
    multiLine: true,
  );
  final match = pattern.firstMatch(routeConfigContent);
  return match?.group(1);
}
