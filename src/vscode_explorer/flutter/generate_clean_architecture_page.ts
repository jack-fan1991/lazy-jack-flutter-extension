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

        const pageName = changeCase.snakeCase( pageNameInput);
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

  // 確保最後一個資料夾是 'presentation'
  if (parts[parts.length - 1] !== 'presentation') {
    return undefined;
  }

  // 直接取 presentation 上一層資料夾作為 feature name
  return parts[parts.length - 2];
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

    return `
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:${APP.flutterLibName}/route/${route_page_args_file_name}';
import '${r.getImportPath('cubit')}';
import '${r.getImportPath('view')}';
import '${r.getImportPath('feature_usecase')}';
import '${r.getImportPath('feature_repository')}';
import '${r.getImportPath('feature_repo_impl')}';
import '${r.getImportPath('feature_datasource_impl')}';

// Tip: It's recommended to use a dependency injection tool like get_it instead of manual instantiation.

class ${argType} extends RouteArgs {
  // TODO: Define the parameters required for this page here
  final String? exampleId;

  const ${argType}({this.exampleId}) : super(routeName: ${r.pageName}.routeName);

  factory ${argType}.fromMap(Map<String, dynamic> map) {
    return ${argType}(
      exampleId: map['exampleId'] as String?,
    );
  }
}

class ${r.pageName} extends StatefulWidget {
  static const routeName = '${webPath}';
  final ${argType} args;

  const ${r.pageName}({super.key, required this.args});

  @override
  State<${r.pageName}> createState() => _${r.pageName}State();
}

class _${r.pageName}State extends State<${r.pageName}> {
  // In a real project, you would use a dependency injection tool like get_it to get the cubit instance.
  // final ${r.cubitName} _cubit = GetIt.instance<${r.cubitName}>();
  late final ${r.cubitName} _cubit;

  @override
  void initState() {
    super.initState();
    // Manual DI for demonstration; consider using get_it in real projects.
    final remoteDataSource = ${r.datasourceImplName}();
    final repository = ${r.repositoryImplName}(remoteDataSource: remoteDataSource);
    final usecase = ${r.usecaseName}(repository);
    _cubit = ${r.cubitName}(usecase);
    _cubit.fetch(widget.args.exampleId ?? '1'); // Initial data fetch
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => _cubit,
      child: Scaffold(
        appBar: AppBar(title: Text('${r.pageNamePascalCase} Page')),
        body: const SafeArea(child: ${r.viewName}()),
        floatingActionButton: FloatingActionButton(
          onPressed: () => _cubit.fetch(widget.args.exampleId ?? '1'),
          child: const Icon(Icons.refresh),
        ),
      ),
    );
  }
}
`;
}


function getPresentationViewTemplate(r: PagePathResolver): string {
    return `
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '${r.getImportPath('cubit')}';
import '${r.getImportPath('state')}';

class ${r.viewName} extends StatelessWidget {
  const ${r.viewName}({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<${r.cubitName}, ${r.stateName}>(
      builder: (context, state) {
        return state.when(
          initial: () => const Center(child: Text('Please click the button to load data')),
          loading: () => const Center(child: CircularProgressIndicator()),
          success: (uiModel) => Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(uiModel.title),
                Text(uiModel.subtitle),
              ],
            ),
          ),
          failure: (message) => Center(child: Text('Error: \$message')),
        );
      },
    );
  }
}
`;
}
function getPresentationCubitTemplate(r: PagePathResolver): string {
    return `
import 'package:bloc/bloc.dart';
import '${r.getImportPath('state')}';
import '${r.getImportPath('feature_usecase')}';
import '${r.getImportPath('ui_model')}';
import '${r.getImportPath('feature_entity')}';

class ${r.cubitName} extends Cubit<${r.stateName}> {
  final ${r.usecaseName} _get${r.featureNamePascalCase};

  ${r.cubitName}(this._get${r.featureNamePascalCase}) : super(const ${r.stateName}.initial());

  Future<void> fetch(String id) async {
    emit(const ${r.stateName}.loading());
    try {
      final entity = await _get${r.featureNamePascalCase}(id);
      final uiModel = ${r.uiModelName}.fromEntity(entity);
      emit(${r.stateName}.success(uiModel));
    } catch (e) {
      emit(${r.stateName}.failure(e.toString()));
    }
  }
}
`;
}

function getPresentationStateTemplate(r: PagePathResolver): string {
    return `
import 'package:freezed_annotation/freezed_annotation.dart';
import '${r.getImportPath('ui_model')}';

part '${r.pageNameSnakeCase}_state.freezed.dart';

@freezed
class ${r.stateName} with _$${r.stateName} {
  const factory ${r.stateName}.initial() = _Initial;
  const factory ${r.stateName}.loading() = _Loading;
  const factory ${r.stateName}.success(${r.uiModelName} uiModel) = _Success;
  const factory ${r.stateName}.failure(String message) = _Failure;
}
`;
}


function getDomainEntityTemplate(r: PagePathResolver): string {
    return `
import 'package:equatable/equatable.dart';

class ${r.entityName} extends Equatable {
  // TODO: 定義業務實體屬性
  final String id;
  final String name;

  const ${r.entityName}({
    required this.id,
    required this.name,
  });

  @override
  List<Object?> get props => [id, name];
}
`;
}


function getPresentationUiModelTemplate(r: PagePathResolver): string {
    const featureEntityName = `${r.featureNamePascalCase}Entity`;
    return `
import 'package:freezed_annotation/freezed_annotation.dart';
import '${r.getImportPath('feature_entity')}';

part '${r.pageNameSnakeCase}_ui_model.freezed.dart';

@freezed
class ${r.uiModelName} with _$${r.uiModelName} {
  const factory ${r.uiModelName}({
    required String title,
    required String subtitle,
  }) = _${r.uiModelName};

  factory ${r.uiModelName}.fromEntity(${featureEntityName} entity) {
    return ${r.uiModelName}(
      title: 'ID: \${entity.id}',
      subtitle: 'Name: \${entity.name}',
    );
  }
}
`;
}

// #endregion