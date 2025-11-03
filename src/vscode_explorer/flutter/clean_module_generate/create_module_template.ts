import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as changeCase from 'change-case';
import { reFormat } from '../../../utils/src/vscode_utils/activate_editor_utils';

const COMMAND_ID = 'lazyJack.createModuleTemplate';

interface ReturnTypeContext {
  baseType: string;
  finalReturnType: string;
  imports: string[];
}

export function registerCreateModuleTemplate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_ID, async (folderUri: vscode.Uri) => {
      if (!folderUri || !folderUri.fsPath) {
        vscode.window.showErrorMessage('請在 modules 目錄下執行指令');
        return;
      }

      const modulesRoot = findModulesRoot(folderUri.fsPath);
      if (!modulesRoot) {
        vscode.window.showErrorMessage('僅支援 lib/modules 目錄下建立模組');
        return;
      }

      if (!modulesRoot.includes(`${path.sep}lib${path.sep}`)) {
        vscode.window.showErrorMessage('模組必須位於 lib/modules 目錄');
        return;
      }

      const featureNameInput = await vscode.window.showInputBox({
        placeHolder: '輸入模組名稱 (例如: transaction)',
        prompt: '將會自動轉換為蛇形命名 (snake_case)',
      });

      if (!featureNameInput) {
        vscode.window.showErrorMessage('模組名稱不可為空');
        return;
      }

      const featureNameSnake = changeCase.snakeCase(featureNameInput);
      const resolver = new ModulePathResolver(modulesRoot, featureNameSnake);
      if (fs.existsSync(resolver.featureDir)) {
        vscode.window.showErrorMessage(`模組 ${resolver.featureNameSnakeCase} 已存在`);
        return;
      }
      const returnContext = resolveReturnType(resolver.modelClassName);

      try {
        createDirectories(resolver);
        createFiles(resolver, returnContext);

        const moduleUri = vscode.Uri.file(resolver.moduleFilePath);
        await vscode.window.showTextDocument(moduleUri);
        await reFormat();

        vscode.window.showInformationMessage(`✅ 模組 "${resolver.featureNamePascalCase}" 模板建立完成`);
      } catch (err: any) {
        console.error(err);
        vscode.window.showErrorMessage(`建立模組失敗: ${err.message}`);
      }
    })
  );
}

function createDirectories(resolver: ModulePathResolver) {
  const dirs = [
    resolver.modulesRoot,
    resolver.featureDir,
    resolver.dataDir,
    resolver.dataDatasourcesDir,
    resolver.dataRepoImplsDir,
    resolver.dataModelsDir,
    resolver.domainDir,
    resolver.domainRepositoriesDir,
  ];

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

function createFiles(resolver: ModulePathResolver, ctx: ReturnTypeContext) {
  writeFileIfAbsent(resolver.moduleFilePath, getModuleFileTemplate(resolver));
  writeFileIfAbsent(resolver.domainRepositoryPath, getDomainRepositoryTemplate(resolver, ctx));
  writeFileIfAbsent(resolver.dataSourcePath, getDataSourceTemplate(resolver, ctx));
  writeFileIfAbsent(resolver.remoteDataSourceImplPath, getRemoteDataSourceTemplate(resolver, ctx));
  writeFileIfAbsent(resolver.repositoryImplPath, getRepositoryImplTemplate(resolver, ctx));
  writeFileIfAbsent(resolver.modelPath, getModelTemplate(resolver));
}

function resolveReturnType(baseType: string): ReturnTypeContext {
  const config = vscode.workspace.getConfiguration('lazy-jack-flutter-extension');
  const wrapperConfig =
    config.get<{ name: string; import: string }>('resultWrapper') ??
    config.get<{ name: string; import: string }>('dataReturnWrapper');

  const imports: string[] = [];

  if (wrapperConfig && wrapperConfig.name && wrapperConfig.import) {
    imports.push(normalizeImport(wrapperConfig.import));
    return {
      baseType,
      finalReturnType: `Future<${wrapperConfig.name}<${baseType}>>`,
      imports,
    };
  }

  return {
    baseType,
    finalReturnType: `Future<${baseType}?>`,
    imports,
  };
}

function normalizeImport(importValue: string): string {
  const trimmed = importValue.trim();
  if (trimmed.startsWith('import ')) {
    return trimmed.endsWith(';') ? trimmed : `${trimmed};`;
  }
  const cleaned = trimmed.replace(/^['"]|['"]$/g, '');
  return `import '${cleaned}';`;
}

function findModulesRoot(fsPath: string): string | undefined {
  let current = fsPath;
  while (true) {
    if (path.basename(current) === 'modules') {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }
}

class ModulePathResolver {
  public readonly modulesRoot: string;
  public readonly featureDir: string;
  public readonly featureNameSnakeCase: string;
  public readonly featureNamePascalCase: string;

  public readonly dataDir: string;
  public readonly dataDatasourcesDir: string;
  public readonly dataRepoImplsDir: string;
  public readonly dataModelsDir: string;
  public readonly domainDir: string;
  public readonly domainRepositoriesDir: string;

  public readonly moduleFilePath: string;
  public readonly domainRepositoryPath: string;
  public readonly dataSourcePath: string;
  public readonly remoteDataSourceImplPath: string;
  public readonly repositoryImplPath: string;
  public readonly modelPath: string;

  public readonly moduleClassName: string;
  public readonly dataSourceClassName: string;
  public readonly remoteDataSourceClassName: string;
  public readonly repositoryInterfaceName: string;
  public readonly repositoryImplName: string;
  public readonly methodName: string;
  public readonly modelClassName: string;

  constructor(modulesRoot: string, featureNameSnakeCase: string) {
    this.modulesRoot = modulesRoot;
    this.featureDir = path.join(modulesRoot, featureNameSnakeCase);
    this.featureNameSnakeCase = featureNameSnakeCase;
    this.featureNamePascalCase = changeCase.pascalCase(featureNameSnakeCase);

    this.dataDir = path.join(this.featureDir, 'data');
    this.dataDatasourcesDir = path.join(this.dataDir, 'sources');
    this.dataRepoImplsDir = path.join(this.dataDir, 'repo_impls');
    this.dataModelsDir = path.join(this.dataDir, 'models');
    this.domainDir = path.join(this.featureDir, 'domain');
    this.domainRepositoriesDir = path.join(this.domainDir, 'repositories');

    this.moduleFilePath = path.join(this.featureDir, `${this.featureNameSnakeCase}_module.dart`);
    this.domainRepositoryPath = path.join(this.domainRepositoriesDir, `${this.featureNameSnakeCase}_repository.dart`);
    this.dataSourcePath = path.join(this.dataDatasourcesDir, `${this.featureNameSnakeCase}_data_source.dart`);
    this.remoteDataSourceImplPath = path.join(this.dataDatasourcesDir, `${this.featureNameSnakeCase}_remote_data_source_impl.dart`);
    this.repositoryImplPath = path.join(this.dataRepoImplsDir, `${this.featureNameSnakeCase}_repository_impl.dart`);
    this.modelPath = path.join(this.dataModelsDir, `${this.featureNameSnakeCase}_model.dart`);

    this.moduleClassName = `${this.featureNamePascalCase}Module`;
    this.dataSourceClassName = `${this.featureNamePascalCase}DataSource`;
    this.remoteDataSourceClassName = `${this.featureNamePascalCase}RemoteDataSourceImpl`;
    this.repositoryInterfaceName = `${this.featureNamePascalCase}Repository`;
    this.repositoryImplName = `${this.featureNamePascalCase}RepositoryImpl`;
    this.methodName = `fetch${this.featureNamePascalCase}`;
    this.modelClassName = `${this.featureNamePascalCase}Model`;
  }

  public get modelFileName(): string {
    return path.basename(this.modelPath);
  }

  public get modelClassFileName(): string {
    return `${this.featureNameSnakeCase}_model.dart`;
  }

  public getModelImport(fromPath: string): string {
    return this.getRelativeImport(fromPath, this.modelPath);
  }

  public getDataSourceImport(fromPath: string): string {
    return this.getRelativeImport(fromPath, this.dataSourcePath);
  }

  public getDomainRepositoryImport(fromPath: string): string {
    return this.getRelativeImport(fromPath, this.domainRepositoryPath);
  }

  private getRelativeImport(fromPath: string, targetPath: string): string {
    const relative = path.relative(path.dirname(fromPath), targetPath).replace(/\\/g, '/');
    if (relative.startsWith('.')) {
      return relative;
    }
    return `./${relative}`;
  }
}

function writeFileIfAbsent(filePath: string, content: string) {
  if (fs.existsSync(filePath)) {
    return;
  }
  fs.writeFileSync(filePath, content.trimStart());
}

function getModuleFileTemplate(r: ModulePathResolver): string {
  return `
import 'package:get_it/get_it.dart';
import 'data/sources/${path.basename(r.dataSourcePath)}';
import 'data/sources/${path.basename(r.remoteDataSourceImplPath)}';
import 'data/repo_impls/${path.basename(r.repositoryImplPath)}';
import 'domain/repositories/${path.basename(r.domainRepositoryPath)}';

/// 建立 ${r.featureNamePascalCase} 模組的依賴注入骨架
class ${r.moduleClassName} {
  ${r.moduleClassName}._();

  static void register(GetIt container) {
    if (!container.isRegistered<${r.dataSourceClassName}>()) {
      container.registerLazySingleton<${r.dataSourceClassName}>(() => ${r.remoteDataSourceClassName}());
    }

    if (!container.isRegistered<${r.repositoryInterfaceName}>()) {
      container.registerLazySingleton<${r.repositoryInterfaceName}>(() => ${r.repositoryImplName}(remote: container()));
    }
  }
}
`;
}

function buildImportBlock(imports: string[]): string {
  const unique = Array.from(new Set(imports.filter(Boolean)));
  if (unique.length === 0) {
    return '';
  }
  return unique.join('\n') + '\n\n';
}

function getDomainRepositoryTemplate(r: ModulePathResolver, ctx: ReturnTypeContext): string {
  const imports = [
    ...ctx.imports,
    `import '${r.getModelImport(r.domainRepositoryPath)}';`,
  ];

  return `
${buildImportBlock(imports)}abstract class ${r.repositoryInterfaceName} {
  ${ctx.finalReturnType} ${r.methodName}();
}
`;
}

function getDataSourceTemplate(r: ModulePathResolver, ctx: ReturnTypeContext): string {
  const imports = [
    ...ctx.imports,
    `import '${r.getModelImport(r.dataSourcePath)}';`,
  ];

  return `
${buildImportBlock(imports)}abstract class ${r.dataSourceClassName} {
  ${ctx.finalReturnType} ${r.methodName}();
}
`;
}

function getRemoteDataSourceTemplate(r: ModulePathResolver, ctx: ReturnTypeContext): string {
  const imports = [
    ...ctx.imports,
    `import '${r.getDataSourceImport(r.remoteDataSourceImplPath)}';`,
    `import '${r.getModelImport(r.remoteDataSourceImplPath)}';`,
  ];

  return `
${buildImportBlock(imports)}class ${r.remoteDataSourceClassName} implements ${r.dataSourceClassName} {
  ${r.remoteDataSourceClassName}();

  @override
  ${ctx.finalReturnType} ${r.methodName}() async {
    // TODO: 實作遠端資料取得流程
    throw UnimplementedError('${r.methodName} 尚未實作');
  }
}
`;
}

function getRepositoryImplTemplate(r: ModulePathResolver, ctx: ReturnTypeContext): string {
  const imports = [
    ...ctx.imports,
    `import '${r.getDataSourceImport(r.repositoryImplPath)}';`,
    `import '${r.getModelImport(r.repositoryImplPath)}';`,
    `import '${r.getDomainRepositoryImport(r.repositoryImplPath)}';`,
  ];

  return `
${buildImportBlock(imports)}class ${r.repositoryImplName} implements ${r.repositoryInterfaceName} {
  ${r.repositoryImplName}({required ${r.dataSourceClassName} remote}) : _remote = remote;

  final ${r.dataSourceClassName} _remote;

  @override
  ${ctx.finalReturnType} ${r.methodName}() {
    // TODO: 實作資料來源協調邏輯
    return _remote.${r.methodName}();
  }
}
`;
}

function getModelTemplate(r: ModulePathResolver): string {
  return `
/// ${r.modelClassName} 為樣板資料模型，可依實際需求調整
class ${r.modelClassName} {
  const ${r.modelClassName}({
    required this.id,
    required this.title,
  });

  final String id;
  final String title;
}
`;
}
