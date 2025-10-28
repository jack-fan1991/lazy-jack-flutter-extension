import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { toUpperCamelCase } from '../../utils/src/regex/regex_utils';
import { reFormat } from '../../utils/src/vscode_utils/activate_editor_utils';
import * as changeCase from "change-case";
import { APP } from '../../extension';
import { getRootPath } from '../../utils/src/vscode_utils/vscode_env_utils';
import { route_page_args_file_name } from './generate_route_temp';

const command_clean_architecture = "command_clean_architecture";

export function registerCleanArchitectureGenerate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(command_clean_architecture, async (folderUri) => {
        let featureName = await vscode.window.showInputBox({
            placeHolder: '輸入功能名稱 (例如: user profile)',
            prompt: '將會自動轉換為蛇形命名 (snake_case)',
        });

        if (!featureName) {
            vscode.window.showErrorMessage('功能名稱不可為空');
            return;
        }

        featureName = changeCase.snakeCase(featureName);
        const resolver = new PathResolver(folderUri.path, featureName);

        try {
            // 1. 創建所有資料夾
            createDirectoryStructure(resolver);

            // 2. 產生所有檔案
            createFeatureFiles(resolver);

            // 3. 完成後操作
            const uri = vscode.Uri.file(resolver.presentation.page);
            await vscode.window.showTextDocument(uri);
            await reFormat();
            vscode.window.showInformationMessage(`💡 是否要將 ${resolver.pageName} 註冊為路由?`, '是', '否').then((value) => {
                if (value === '是') {
                    // 確保在 Windows 和 Unix-like 系統上都使用正斜線
                    const importPathValue = path.join(resolver.libDir, `${resolver.featureNameSnakeCase}`, 'presentation', 'pages', `${resolver.featureNameSnakeCase}_page.dart`).replace(/\\/g, '/');
                    const importStatement = `import 'package:${APP.flutterLibName}/${importPathValue}';`;
                    const argType = `Route${resolver.pageName}Args`;
                    vscode.commands.executeCommand(
                        "command_create_routeConfiguration", 
                        resolver.featureNamePascalCase, 
                        `${resolver.pageName}.routeName`, 
                        importStatement,
                        resolver.pageName, 
                        resolver.featureNamePascalCase,
                        argType
                        
                    );
                }
            });

        } catch (err: any) {
            console.error(err);
            vscode.window.showErrorMessage(`創建功能失敗: ${err.message}`);
        }
    }));
}

function createDirectoryStructure(resolver: PathResolver) {
    const dirs = [
        resolver.featureDir,
        resolver.di.dir,
        resolver.domain.dir,
        resolver.domain.entitiesDir,
        resolver.domain.repoDir,
        resolver.domain.usecasesDir,
        resolver.data.dir,
        resolver.data.datasourcesDir,
        resolver.data.modelsDir,
        resolver.data.repoImplsDir,
        resolver.presentation.dir,
        resolver.presentation.blocDir,
        resolver.presentation.modelsDir,
        resolver.presentation.widgetsDir,
        resolver.presentation.pagesDir,
    ];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

function createFeatureFiles(resolver: PathResolver) {
    // DI
    fs.writeFileSync(resolver.di.injection, getDiInjectionTemplate(resolver));

    // Domain
    fs.writeFileSync(resolver.domain.entity, getDomainEntityTemplate(resolver));
    fs.writeFileSync(resolver.domain.repository, getDomainRepositoryTemplate(resolver));
    fs.writeFileSync(resolver.domain.usecase, getDomainUsecaseTemplate(resolver));

    // Data
    fs.writeFileSync(resolver.data.datasource, getDataDatasourceTemplate(resolver));
    fs.writeFileSync(resolver.data.datasourceImpl, getDataDatasourceImplTemplate(resolver));
    fs.writeFileSync(resolver.data.model, getDataModelTemplate(resolver));
    fs.writeFileSync(resolver.data.repositoryImpl, getDataRepositoryImplTemplate(resolver));

    // Presentation
    fs.writeFileSync(resolver.presentation.cubit, getPresentationCubitTemplate(resolver));
    fs.writeFileSync(resolver.presentation.state, getPresentationStateTemplate(resolver));
    fs.writeFileSync(resolver.presentation.uiModel, getPresentationUiModelTemplate(resolver));
    fs.writeFileSync(resolver.presentation.widget, getPresentationWidgetTemplate(resolver));
    fs.writeFileSync(resolver.presentation.page, getPresentationPageTemplate(resolver));
}

// #region Templates

function getDiInjectionTemplate(r: PathResolver): string {
    return `
// TODO: 設置此模組的依賴注入
// import 'package:get_it/get_it.dart';

// final _getIt = GetIt.instance;

void setup${r.featureNamePascalCase}Dependencies() {
  // Services
  // _getIt.registerLazySingleton(() => ApiService());

  // Datasources
  // _getIt.registerLazySingleton<${r.datasourceName}>(() => ${r.datasourceImplName}(_getIt()));

  // Repositories
  // _getIt.registerLazySingleton<${r.repositoryName}>(() => ${r.repositoryImplName}(remoteDataSource: _getIt()));

  // UseCases
  // _getIt.registerLazySingleton(() => ${r.usecaseName}(_getIt());

  // Blocs
  // _getIt.registerFactory(() => ${r.cubitName}(_getIt());
}
`;
}

function getDomainEntityTemplate(r: PathResolver): string {
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

function getDomainRepositoryTemplate(r: PathResolver): string {
    return `
import '${r.importPath("domain", "entity")}';

abstract class ${r.repositoryName} {
  Future<${r.entityName}> get${r.featureNamePascalCase}(String id);
}
`;
}

function getDomainUsecaseTemplate(r: PathResolver): string {
    return `
import '${r.importPath("domain", "entity")}';
import '${r.importPath("domain", "repository")}';

class ${r.usecaseName} {
  final ${r.repositoryName} repository;

  ${r.usecaseName}(this.repository);

  Future<${r.entityName}> call(String id) async {
    // 在這裡可以加入參數驗證、日誌記錄等業務邏輯
    return await repository.get${r.featureNamePascalCase}(id);
  }
}
`;
}

function getDataDatasourceTemplate(r: PathResolver): string {
    return `
import '${r.importPath("data", "model")}';

abstract class ${r.datasourceName} {
  Future<${r.modelName}> fetch${r.featureNamePascalCase}(String id);
}
`;
}

function getDataDatasourceImplTemplate(r: PathResolver): string {
    return `
import '${r.importPath("data", "datasource")}';
import '${r.importPath("data", "model")}';

// import 'package:dio/dio.dart'; // 範例

class ${r.datasourceImplName} implements ${r.datasourceName} {
  // final Dio dio;
  // ${r.datasourceImplName}(this.dio);

  @override
  Future<${r.modelName}> fetch${r.featureNamePascalCase}(String id) async {
    // final response = await dio.get('/${r.featureNameSnakeCase}/$id');
    // if (response.statusCode == 200) {
    //   return ${r.modelName}.fromJson(response.data);
    // } else {
    //   throw Exception('Failed to load ${r.featureNameSnakeCase}');
    // }
    await Future.delayed(const Duration(seconds: 1));
    return ${r.modelName}(id: '1', name: '範例資料');
  }
}
`;
}

function getDataModelTemplate(r: PathResolver): string {
    return `
import '${r.importPath("domain", "entity")}';
import 'package:freezed_annotation/freezed_annotation.dart';

part '${r.featureNameSnakeCase}_model.freezed.dart';
part '${r.featureNameSnakeCase}_model.g.dart';

@freezed
class ${r.modelName} with _$${r.modelName} {
    const ${r.modelName}._();

    const factory ${r.modelName}({
      required String id,
      required String name,
    }) = _${r.modelName};

    factory ${r.modelName}.fromJson(Map<String, dynamic> json) => _$${r.modelName}FromJson(json);

    // 將 Model 轉換為業務層的 Entity
    ${r.entityName} toEntity() {
      return ${r.entityName}(
        id: id,
        name: name,
      );
    }
}
`;
}

function getDataRepositoryImplTemplate(r: PathResolver): string {
    return `
import '${r.importPath("data", "datasource")}';
import '${r.importPath("domain", "entity")}';
import '${r.importPath("domain", "repository")}';

class ${r.repositoryImplName} implements ${r.repositoryName} {
  final ${r.datasourceName} remoteDataSource;
  // final ${r.datasourceName} localDataSource;

  ${r.repositoryImplName}({
    required this.remoteDataSource,
    // required this.localDataSource,
  });

  @override
  Future<${r.entityName}> get${r.featureNamePascalCase}(String id) async {
    try {
      // final remoteData = await remoteDataSource.fetch${r.featureNamePascalCase}(id);
      // return remoteData.toEntity();
      await Future.delayed(const Duration(seconds: 1));
      return ${r.entityName}(id: '1', name: '範例資料');
    } catch (e) {
      // 處理錯誤，例如從本地資料源獲取或拋出自定義異常
      throw Exception('Failed to get data for $id');
    }
  }
}
`;
}

function getPresentationCubitTemplate(r: PathResolver): string {
    return `
import 'package:bloc/bloc.dart';
import '${r.importPath("presentation", "state")}';
import '${r.importPath("domain", "usecase")}';
import '${r.importPath("presentation", "uiModel")}';

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

function getPresentationStateTemplate(r: PathResolver): string {
    return `
import 'package:freezed_annotation/freezed_annotation.dart';
import '${r.importPath("presentation", "uiModel")}';

part '${r.featureNameSnakeCase}_state.freezed.dart';

@freezed
class ${r.stateName} with _$${r.stateName} {
  const factory ${r.stateName}.initial() = _Initial;
  const factory ${r.stateName}.loading() = _Loading;
  const factory ${r.stateName}.success(final ${r.uiModelName} uiModel) = _Success;
  const factory ${r.stateName}.failure(final String message) = _Failure;
}
`;
}

function getPresentationUiModelTemplate(r: PathResolver): string {
    return `
import 'package:freezed_annotation/freezed_annotation.dart';
import '${r.importPath("domain", "entity")}';

part '${r.featureNameSnakeCase}_ui_model.freezed.dart';

@freezed
class ${r.uiModelName} with _$${r.uiModelName} {
  const factory ${r.uiModelName}({
    required String title,
    required String subtitle,
  }) = _${r.uiModelName};

  factory ${r.uiModelName}.fromEntity(${r.entityName} entity) {
    return ${r.uiModelName}(
      title: 'ID: \${entity.id}',
      subtitle: 'Name: \${entity.name}',
    );
  }
}
`;
}

function getPresentationWidgetTemplate(r: PathResolver): string {
    return `
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '${r.importPath("presentation", "cubit")}';
import '${r.importPath("presentation", "state")}';
import '${r.importPath("presentation", "uiModel")}';

class ${r.widgetName} extends StatelessWidget {
  const ${r.widgetName}({super.key});

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

function getPresentationPageTemplate(r: PathResolver): string {
  const argType = `Route${r.pageName}Args`;
  const webPath = changeCase.paramCase(r.featureNameSnakeCase);
  const featurePath = `${r.libDir}/${r.featureNameSnakeCase}`;
  const repoImplImport = `package:${APP.flutterLibName}/${featurePath}/data/repo_impls/${r.featureNameSnakeCase}_repository_impl.dart`;
  const datasourceImplImport = `package:${APP.flutterLibName}/${featurePath}/data/datasources/${r.featureNameSnakeCase}_remote_datasource_impl.dart`;

  return `
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:${APP.flutterLibName}/route/${route_page_args_file_name}';
import '${r.importPath("presentation", "cubit")}';
import '${r.importPath("presentation", "view")}';
import '${r.importPath("domain", "usecase")}';
import '${r.importPath("domain", "repository")}';
import '${repoImplImport}';
import '${datasourceImplImport}';

// Tip: It's recommended to use a dependency injection tool like get_it instead of manual instantiation.

class ${argType} extends RouteArgs {
  // TODO: Define the parameters required for this page here
  final String? exampleId;

  const ${argType}({this.exampleId})
      : super(routeName: ${r.pageName}.routeName);

  factory ${argType}.fromMap(Map<String, dynamic> map) {
    return ${argType}(
      exampleId: map['exampleId'] as String?,
    );
  }
}

class ${r.pageName} extends StatefulWidget {
  static const routeName = '${webPath}';
  final ${argType} args;

  const ${r.pageName}({
    super.key,
    required this.args,
  });

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
    // This is a manual dependency injection for demonstration purposes.
    // In a real project, it is highly recommended to use a dependency injection framework (e.g., get_it).
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
        appBar: AppBar(
          title: Text('${r.featureNamePascalCase} Page'),
        ),
        body: SafeArea(
          child: const ${r.widgetName}(),
        ),
        floatingActionButton: FloatingActionButton(
          onPressed: () {
            _cubit.fetch(widget.args.exampleId ?? '1');
          },
          child: const Icon(Icons.refresh),
        ),
      ),
    );
  }
}
`;
}

// #endregion

class PathResolver {
    // Base Paths
    public readonly rootPath: string;
    public readonly libDir: string;
    public readonly featureDir: string;

    // Feature Names
    public readonly featureNameSnakeCase: string;
    public readonly featureNamePascalCase: string;

    // Layer Directories
    public readonly di: { dir: string; injection: string };
    public readonly domain: { dir: string; entitiesDir: string; repoDir: string; usecasesDir: string; entity: string; repository: string; usecase: string; };
    public readonly data: { dir: string; datasourcesDir: string; modelsDir: string; repoImplsDir: string; datasource: string; datasourceImpl: string; model: string; repositoryImpl: string; };
    public readonly presentation: { dir: string; blocDir: string; modelsDir: string; widgetsDir: string; pagesDir: string; cubit: string; state: string; uiModel: string; widget: string; page: string; };

    // Class Names
    public readonly entityName: string;
    public readonly repositoryName: string;
    public readonly usecaseName: string;
    public readonly datasourceName: string;
    public readonly datasourceImplName: string;
    public readonly modelName: string;
    public readonly repositoryImplName: string;
    public readonly cubitName: string;
    public readonly stateName: string;
    public readonly uiModelName: string;
    public readonly widgetName: string;
    public readonly pageName: string;

    constructor(currentPath: string, featureName: string) {
        this.rootPath = currentPath;
        this.featureNameSnakeCase = featureName;
        this.featureNamePascalCase = toUpperCamelCase(featureName);

        this.libDir = this.rootPath.split('lib/')[1];
        this.featureDir = path.join(this.rootPath, `${this.featureNameSnakeCase}`);

        // DI Paths
        this.di = {
            dir: path.join(this.featureDir, 'di'),
            injection: path.join(this.featureDir, 'di', 'injection.dart'),
        };

        // Domain Paths
        this.domain = {
            dir: path.join(this.featureDir, 'domain'),
            entitiesDir: path.join(this.featureDir, 'domain', 'entities'),
            repoDir: path.join(this.featureDir, 'domain', 'repo'),
            usecasesDir: path.join(this.featureDir, 'domain', 'usecases'),
            entity: path.join(this.featureDir, 'domain', 'entities', `${this.featureNameSnakeCase}_entity.dart`),
            repository: path.join(this.featureDir, 'domain', 'repo', `${this.featureNameSnakeCase}_repository.dart`),
            usecase: path.join(this.featureDir, 'domain', 'usecases', `get_${this.featureNameSnakeCase}.dart`),
        };

        // Data Paths
        this.data = {
            dir: path.join(this.featureDir, 'data'),
            datasourcesDir: path.join(this.featureDir, 'data', 'datasources'),
            modelsDir: path.join(this.featureDir, 'data', 'models'),
            repoImplsDir: path.join(this.featureDir, 'data', 'repo_impls'),
            datasource: path.join(this.featureDir, 'data', 'datasources', `${this.featureNameSnakeCase}_remote_datasource.dart`),
            datasourceImpl: path.join(this.featureDir, 'data', 'datasources', `${this.featureNameSnakeCase}_remote_datasource_impl.dart`),
            model: path.join(this.featureDir, 'data', 'models', `${this.featureNameSnakeCase}_model.dart`),
            repositoryImpl: path.join(this.featureDir, 'data', 'repo_impls', `${this.featureNameSnakeCase}_repository_impl.dart`),
        };

        // Presentation Paths
        this.presentation = {
            dir: path.join(this.featureDir, 'presentation'),
            blocDir: path.join(this.featureDir, 'presentation', 'bloc'),
            modelsDir: path.join(this.featureDir, 'presentation', 'models'),
            widgetsDir: path.join(this.featureDir, 'presentation', 'widgets'),
            pagesDir: path.join(this.featureDir, 'presentation', 'pages'),
            cubit: path.join(this.featureDir, 'presentation', 'bloc', `${this.featureNameSnakeCase}_cubit.dart`),
            state: path.join(this.featureDir, 'presentation', 'bloc', `${this.featureNameSnakeCase}_state.dart`),
            uiModel: path.join(this.featureDir, 'presentation', 'models', `${this.featureNameSnakeCase}_ui_model.dart`),
            widget: path.join(this.featureDir, 'presentation', 'widgets', `${this.featureNameSnakeCase}_view.dart`),
            page: path.join(this.featureDir, 'presentation', 'pages', `${this.featureNameSnakeCase}_page.dart`),
        };

        // Class Names
        this.entityName = `${this.featureNamePascalCase}Entity`;
        this.repositoryName = `${this.featureNamePascalCase}Repository`;
        this.usecaseName = `Get${this.featureNamePascalCase}`;
        this.datasourceName = `${this.featureNamePascalCase}RemoteDataSource`;
        this.datasourceImplName = `${this.featureNamePascalCase}RemoteDataSourceImpl`;
        this.modelName = `${this.featureNamePascalCase}Model`;
        this.repositoryImplName = `${this.featureNamePascalCase}RepositoryImpl`;
        this.cubitName = `${this.featureNamePascalCase}Cubit`;
        this.stateName = `${this.featureNamePascalCase}State`;
        this.uiModelName = `${this.featureNamePascalCase}UiModel`;
        this.widgetName = `${this.featureNamePascalCase}View`;
        this.pageName = `${this.featureNamePascalCase}Page`;
    }

    public importPath(layer: 'domain' | 'data' | 'presentation', file: 'entity' | 'repository' | 'usecase' | 'datasource' | 'model' | 'repositoryImpl' | 'cubit' | 'state' | 'uiModel' | 'view' | 'page'): string {
        const featurePath = `${this.libDir}/${this.featureNameSnakeCase}`;
        switch (layer) {
            case 'domain':
                if (file === 'entity') return `package:${APP.flutterLibName}/${featurePath}/domain/entities/${this.featureNameSnakeCase}_entity.dart`;
                if (file === 'repository') return `package:${APP.flutterLibName}/${featurePath}/domain/repo/${this.featureNameSnakeCase}_repository.dart`;
                if (file === 'usecase') return `package:${APP.flutterLibName}/${featurePath}/domain/usecases/get_${this.featureNameSnakeCase}.dart`;
                break;
            case 'data':
                 if (file === 'datasource') return `package:${APP.flutterLibName}/${featurePath}/data/datasources/${this.featureNameSnakeCase}_remote_datasource.dart`;
                 if (file === 'model') return `package:${APP.flutterLibName}/${featurePath}/data/models/${this.featureNameSnakeCase}_model.dart`;
                 break;
            case 'presentation':
                if (file === 'cubit') return `package:${APP.flutterLibName}/${featurePath}/presentation/bloc/${this.featureNameSnakeCase}_cubit.dart`;
                if (file === 'state') return `package:${APP.flutterLibName}/${featurePath}/presentation/bloc/${this.featureNameSnakeCase}_state.dart`;
                if (file === 'view') return `package:${APP.flutterLibName}/${featurePath}/presentation/widgets/${this.featureNameSnakeCase}_view.dart`;
                if (file === 'uiModel') return `package:${APP.flutterLibName}/${featurePath}/presentation/models/${this.featureNameSnakeCase}_ui_model.dart`;
                break;
        }
        throw new Error(`Invalid import path combination: ${layer}/${file}`);
    }
}