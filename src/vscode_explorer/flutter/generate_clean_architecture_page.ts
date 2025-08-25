import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as changeCase from "change-case";
import { APP } from '../../extension';
import { reFormat } from '../../utils/src/vscode_utils/activate_editor_utils';
import { getRootPath } from '../../utils/src/vscode_utils/vscode_env_utils';
import { route_page_args_file_name } from './generate_route_temp';

const COMMAND_ID = "lazyJack.generateCleanArchitecturePage";

export function registerCleanArchitecturePageGenerate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(COMMAND_ID, async (folderUri: vscode.Uri) => {
        const featureName = getFeatureNameFromPath(folderUri.path);
        if (!featureName) {
            vscode.window.showErrorMessage('無法從路徑中確定 Feature 名稱。請確保 "presentation" 目錄位於 "features" 目錄下。');
            return;
        }

        const pageNameInput = await vscode.window.showInputBox({
            placeHolder: '輸入 Page/View 名稱 (例如: user settings)',
            prompt: '將會自動轉換為蛇形命名 (snake_case)',
        });

        if (!pageNameInput) {
            vscode.window.showErrorMessage('名稱不可為空');
            return;
        }

        const pageName = changeCase.snakeCase(pageNameInput);
        const resolver = new PagePathResolver(folderUri.path, featureName, pageName);

        try {
            createDirectoryStructure(resolver);
            createPageFiles(resolver);

            const uri = vscode.Uri.file(resolver.pagePath);
            await vscode.window.showTextDocument(uri);
            await reFormat();
             vscode.window.showInformationMessage(`✅ Page 模組 for "${resolver.pageNamePascalCase}" 建立成功！`);
            vscode.window.showInformationMessage(`💡 是否要將 ${resolver.pageNamePascalCase}Page 註冊為路由?`, '是', '否').then((value) => {
                if (value === '是') {
                    const importPathValue = path.join(resolver.libDir, 'pages', `${resolver.pageNameSnakeCase}_page.dart`).replace(/\\/g, '/');
                    const importStatement = `import 'package:${APP.flutterLibName}/${importPathValue}';`;
                    const argType = `Route${resolver.pageNamePascalCase}PageArgs`;
                    vscode.commands.executeCommand(
                        "command_create_routeConfiguration",
                        resolver.pageNamePascalCase,
                        `${resolver.pageNamePascalCase}Page.routeName`,
                        importStatement,
                        `${resolver.pageNamePascalCase}Page`,
                        resolver.pageNamePascalCase,
                        argType
                    );
                }
            });

        } catch (err: any) {
            console.error(err);
            vscode.window.showErrorMessage(`建立檔案失敗: ${err.message}`);
        }
    }));
}

function createDirectoryStructure(resolver: PagePathResolver) {
    const dirs = [
        resolver.pagesDir,
        resolver.blocDir,
        resolver.widgetsDir,
        resolver.entitiesDir,
        resolver.modelsDir,
    ];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

function createPageFiles(resolver: PagePathResolver) {
    fs.writeFileSync(resolver.pagePath, getPresentationPageTemplate(resolver));
    fs.writeFileSync(resolver.cubitPath, getPresentationCubitTemplate(resolver));
    fs.writeFileSync(resolver.statePath, getPresentationStateTemplate(resolver));
    fs.writeFileSync(resolver.viewPath, getPresentationViewTemplate(resolver));
    fs.writeFileSync(resolver.entityPath, getDomainEntityTemplate(resolver));
    fs.writeFileSync(resolver.uiModelPath, getPresentationUiModelTemplate(resolver));
}

function getFeatureNameFromPath(filePath: string): string | undefined {
    const parts = filePath.split(path.sep);
    const featuresIndex = parts.indexOf('features');
    if (featuresIndex !== -1 && featuresIndex + 1 < parts.length) {
        return parts[featuresIndex + 1];
    }
    const libIndex = parts.indexOf('lib');
    if (libIndex !== -1 && libIndex + 2 < parts.length) {
        return parts[libIndex + 1]
    }
    return undefined;
}

class PagePathResolver {
    public readonly presentationDir: string;
    public readonly featureNameSnakeCase: string;
    public readonly featureNamePascalCase: string;
    public readonly pageNameSnakeCase: string;
    public readonly pageNamePascalCase: string;

    public readonly pagesDir: string;
    public readonly blocDir: string;
    public readonly widgetsDir: string;
    public readonly entitiesDir: string;
    public readonly modelsDir: string;

    public readonly pagePath: string;
    public readonly cubitPath: string;
    public readonly statePath: string;
    public readonly viewPath: string;
    public readonly entityPath: string;
    public readonly uiModelPath: string;
    public readonly libDir: string;

    // Class Names
    public readonly entityName: string;
    public readonly uiModelName: string;
    public readonly cubitName: string;
    public readonly stateName: string;
    public readonly viewName: string;
    public readonly pageName: string;
    public readonly usecaseName: string;
    public readonly repositoryImplName: string;
    public readonly datasourceImplName: string;


    constructor(presentationPath: string, featureName: string, pageName: string) {
        this.presentationDir = presentationPath;
        this.featureNameSnakeCase = featureName;
        this.featureNamePascalCase = changeCase.pascalCase(featureName);
        this.pageNameSnakeCase = pageName;
        this.pageNamePascalCase = changeCase.pascalCase(pageName);

        this.pagesDir = path.join(this.presentationDir, 'pages');
        this.blocDir = path.join(this.presentationDir, 'bloc');
        this.widgetsDir = path.join(this.presentationDir, 'widgets');
        const featureDir = path.dirname(this.presentationDir);
        // domain 層
        const domainDir = path.join(featureDir, "domain");

        // entities 放在 domain 下
        this.entitiesDir = path.join(domainDir, "entities");
        this.modelsDir = path.join(this.presentationDir, 'models');

        this.pagePath = path.join(this.pagesDir, `${this.pageNameSnakeCase}_page.dart`);
        this.cubitPath = path.join(this.blocDir, `${this.pageNameSnakeCase}_cubit.dart`);
        this.statePath = path.join(this.blocDir, `${this.pageNameSnakeCase}_state.dart`);
        this.viewPath = path.join(this.widgetsDir, `${this.pageNameSnakeCase}_view.dart`);
        this.entityPath = path.join(this.entitiesDir, `${this.pageNameSnakeCase}_entity.dart`);
        this.uiModelPath = path.join(this.modelsDir, `${this.pageNameSnakeCase}_ui_model.dart`);

        const libIndex = this.presentationDir.indexOf('lib');
        if (libIndex === -1) throw new Error('無法找到 "lib" 目錄');
        this.libDir = this.presentationDir.substring(libIndex + 'lib'.length + 1);

        // Class Names
        this.entityName = `${this.pageNamePascalCase}Entity`;
        this.uiModelName = `${this.pageNamePascalCase}UiModel`;
        this.cubitName = `${this.pageNamePascalCase}Cubit`;
        this.stateName = `${this.pageNamePascalCase}State`;
        this.viewName = `${this.pageNamePascalCase}View`;
        this.pageName = `${this.pageNamePascalCase}Page`;
        this.usecaseName = `Get${this.featureNamePascalCase}`;
        this.repositoryImplName = `${this.featureNamePascalCase}RepositoryImpl`;
        this.datasourceImplName = `${this.featureNamePascalCase}RemoteDataSourceImpl`;
    }

    public getImportPath(fileType: 'cubit' | 'state' | 'view' | 'entity' | 'ui_model' | 'feature_usecase' | 'feature_entity' | 'feature_repository' | 'feature_datasource_impl' | 'feature_repo_impl'): string {
        const featureLibPath = path.dirname(this.libDir);
        const currentFeatureLibPath = this.libDir

        switch (fileType) {
            case 'cubit':
                return `package:${APP.flutterLibName}/${path.join(currentFeatureLibPath, 'bloc', `${this.pageNameSnakeCase}_cubit.dart`).replace(/\\/g, '/')}`;
            case 'state':
                return `package:${APP.flutterLibName}/${path.join(currentFeatureLibPath, 'bloc', `${this.pageNameSnakeCase}_state.dart`).replace(/\\/g, '/')}`;
            case 'view':
                return `package:${APP.flutterLibName}/${path.join(currentFeatureLibPath, 'widgets', `${this.pageNameSnakeCase}_view.dart`).replace(/\\/g, '/')}`;
            case 'entity':
                return `package:${APP.flutterLibName}/${path.join(currentFeatureLibPath, 'entities', `${this.pageNameSnakeCase}_entity.dart`).replace(/\\/g, '/')}`;
            case 'ui_model':
                return `package:${APP.flutterLibName}/${path.join(currentFeatureLibPath, 'models', `${this.pageNameSnakeCase}_ui_model.dart`).replace(/\\/g, '/')}`;
            case 'feature_usecase':
                return `package:${APP.flutterLibName}/${path.join(featureLibPath, 'domain', 'usecases', `get_${this.featureNameSnakeCase}.dart`).replace(/\\/g, '/')}`;
            case 'feature_entity':
                return `package:${APP.flutterLibName}/${path.join(featureLibPath, 'domain', 'entities', `${this.featureNameSnakeCase}_entity.dart`).replace(/\\/g, '/')}`;
            case 'feature_repository':
                return `package:${APP.flutterLibName}/${path.join(featureLibPath, 'domain', 'repo', `${this.featureNameSnakeCase}_repository.dart`).replace(/\\/g, '/')}`;
            case 'feature_datasource_impl':
                return `package:${APP.flutterLibName}/${path.join(featureLibPath, 'data', 'datasources', `${this.featureNameSnakeCase}_remote_datasource_impl.dart`).replace(/\\/g, '/')}`;
            case 'feature_repo_impl':
                return `package:${APP.flutterLibName}/${path.join(featureLibPath, 'data', 'repo_impls', `${this.featureNameSnakeCase}_repository_impl.dart`).replace(/\\/g, '/')}`;
        }
    }
}

// #region Templates

function getPresentationPageTemplate(r: PagePathResolver): string {
    const argType = `Route${r.pageName}Args`;
    const webPath = changeCase.paramCase(r.pageNameSnakeCase);

    return `\nimport 'package:flutter/material.dart';\nimport 'package:flutter_bloc/flutter_bloc.dart';\nimport 'package:${APP.flutterLibName}/route/${route_page_args_file_name}';\nimport '${r.getImportPath('cubit')}';\nimport '${r.getImportPath('view')}';\nimport '${r.getImportPath('feature_usecase')}';\nimport '${r.getImportPath('feature_repository')}';\nimport '${r.getImportPath('feature_repo_impl')}';\nimport '${r.getImportPath('feature_datasource_impl')}';\n\n// Tip: It's recommended to use a dependency injection tool like get_it instead of manual instantiation.\n\nclass ${argType} extends RouteArgs {\n  // TODO: Define the parameters required for this page here\n  final String? exampleId;\n\n  const ${argType}({this.exampleId})\n      : super(routeName: ${r.pageName}.routeName);\n\n  factory ${argType}.fromMap(Map<String, dynamic> map) {\n    return ${argType}(\n      exampleId: map['exampleId'] as String?,\n    );\n  }\n}\n\nclass ${r.pageName} extends StatefulWidget {\n  static const routeName = '${webPath}';\n  final ${argType} args;\n\n  const ${r.pageName}({\n    super.key,\n    required this.args,\n  });\n\n  @override\n  State<${r.pageName}> createState() => _${r.pageName}State();\n}\n\nclass _${r.pageName}State extends State<${r.pageName}> {\n  // In a real project, you would use a dependency injection tool like get_it to get the cubit instance.\n  // final ${r.cubitName} _cubit = GetIt.instance<${r.cubitName}>();\n  late final ${r.cubitName} _cubit;\n\n  @override\n  void initState() {\n    super.initState();\n    // This is a manual dependency injection for demonstration purposes.\n    // In a real project, it is highly recommended to use a dependency injection framework (e.g., get_it).\n    final remoteDataSource = ${r.datasourceImplName}();\n    final repository = ${r.repositoryImplName}(remoteDataSource: remoteDataSource);\n    final usecase = ${r.usecaseName}(repository);\n    _cubit = ${r.cubitName}(usecase);\n    _cubit.fetch(widget.args.exampleId ?? '1'); // Initial data fetch\n  }\n\n  @override\n  Widget build(BuildContext context) {\n    return BlocProvider.value(\n      value: _cubit,\n      child: Scaffold(\n        appBar: AppBar(\n          title: Text('${r.pageNamePascalCase} Page'),\n        ),\n        body: SafeArea(\n          child: const ${r.viewName}(),\n        ),\n        floatingActionButton: FloatingActionButton(\n          onPressed: () {\n            _cubit.fetch(widget.args.exampleId ?? '1');\n          },\n          child: const Icon(Icons.refresh),\n        ),\n      ),\n    );\n  }\n}\n`;
}

function getPresentationViewTemplate(r: PagePathResolver): string {
    return `\nimport 'package:flutter/material.dart';\nimport 'package:flutter_bloc/flutter_bloc.dart';\nimport '${r.getImportPath('cubit')}';\nimport '${r.getImportPath('state')}';\n\nclass ${r.viewName} extends StatelessWidget {\n  const ${r.viewName}({super.key});\n\n  @override\n  Widget build(BuildContext context) {\n    return BlocBuilder<${r.cubitName}, ${r.stateName}>(\n      builder: (context, state) {\n        return state.when(\n          initial: () => const Center(child: Text('Please click the button to load data')),\n          loading: () => const Center(child: CircularProgressIndicator()),\n          success: (uiModel) => Center(\n            child: Column(\n              mainAxisAlignment: MainAxisAlignment.center,\n              children: [\n                Text(uiModel.title),\n                Text(uiModel.subtitle),\n              ],\n            ),\n          ),\n          failure: (message) => Center(child: Text('Error: $message')),\n        );\n      },\n    );\n  }\n}\n`;
}

function getPresentationCubitTemplate(r: PagePathResolver): string {
    return `\nimport 'package:bloc/bloc.dart';\nimport '${r.getImportPath('state')}';\nimport '${r.getImportPath('feature_usecase')}';\nimport '${r.getImportPath('ui_model')}';\nimport '${r.getImportPath('feature_entity')}';\n\nclass ${r.cubitName} extends Cubit<${r.stateName}> {\n  final ${r.usecaseName} _get${r.featureNamePascalCase};\n\n  ${r.cubitName}(this._get${r.featureNamePascalCase}) : super(const ${r.stateName}.initial());\n\n  Future<void> fetch(String id) async {\n    emit(const ${r.stateName}.loading());\n    try {\n      final entity = await _get${r.featureNamePascalCase}(id);\n      final uiModel = ${r.uiModelName}.fromEntity(entity);\n      emit(${r.stateName}.success(uiModel));\n    } catch (e) {\n      emit(${r.stateName}.failure(e.toString()));\n    }\n  }\n}\n`;
}

function getPresentationStateTemplate(r: PagePathResolver): string {
    return `\nimport 'package:freezed_annotation/freezed_annotation.dart';\nimport '${r.getImportPath('ui_model')}';\n\npart '${r.pageNameSnakeCase}_state.freezed.dart';\n\n@freezed\nclass ${r.stateName} with _\$${r.stateName} {\n  const factory ${r.stateName}.initial() = _Initial;\n  const factory ${r.stateName}.loading() = _Loading;\n  const factory ${r.stateName}.success(final ${r.uiModelName} uiModel) = _Success;\n  const factory ${r.stateName}.failure(final String message) = _Failure;\n}\n`;
}

function getDomainEntityTemplate(r: PagePathResolver): string {
    return `\nimport 'package:equatable/equatable.dart';\n\nclass ${r.entityName} extends Equatable {\n  // TODO: 定義業務實體屬性\n  final String id;\n  final String name;\n\n  const ${r.entityName}({\n    required this.id,\n    required this.name,\n  });\n\n  @override\n  List<Object?> get props => [id, name];\n}\n`;
}

function getPresentationUiModelTemplate(r: PagePathResolver): string {
    const featureEntityName = `${r.featureNamePascalCase}Entity`; return `\nimport 'package:freezed_annotation/freezed_annotation.dart';\nimport '${r.getImportPath('feature_entity')}';\n\npart '${r.pageNameSnakeCase}_ui_model.freezed.dart';\n\n@freezed\nclass ${r.uiModelName} with _\$${r.uiModelName} {\n  const factory ${r.uiModelName}({\n    required String title,\n    required String subtitle,\n  }) = _${r.uiModelName};\n\n  factory ${r.uiModelName}.fromEntity(${featureEntityName} entity) {\n    return ${r.uiModelName}(\n      title: 'ID: \${entity.id}',\n      subtitle: 'Name: \${entity.name}',\n    );\n  }\n}\n`;
}

// #endregion