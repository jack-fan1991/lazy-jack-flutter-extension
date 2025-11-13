import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as changeCase from "change-case";
import { reFormat } from '../../../utils/src/vscode_utils/activate_editor_utils';
import { APP } from '../../../extension';

const COMMAND_ID = "lazyJack.cleanArch.addBlocWidget";

export function registerAddBlocWidget(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(COMMAND_ID, async (folderUri: vscode.Uri) => {
        const cubitNameInput = await vscode.window.showInputBox({
            placeHolder: '輸入 Cubit 名稱 (例如: user settings)',
            prompt: '將會自動轉換為蛇形命名 (snake_case)',
        });

        if (!cubitNameInput) {
            vscode.window.showErrorMessage('名稱不可為空');
            return;
        }

        const cubitName = changeCase.snakeCase(cubitNameInput);
        const resolver = new CubitPathResolver(folderUri.path, cubitName);

        try {
            createDirectoryStructure(resolver);
            createCubitFiles(resolver);

            const uri = vscode.Uri.file(resolver.cubitPath);
            await vscode.window.showTextDocument(uri);
            await reFormat();
            vscode.window.showInformationMessage(`✅ Cubit 檔案 for "${resolver.cubitNamePascalCase}" 建立成功！`);

        } catch (err: any) {
            console.error(err);
            vscode.window.showErrorMessage(`建立檔案失敗: ${err.message}`);
        }
    }));
}

function createDirectoryStructure(resolver: CubitPathResolver) {
    const dirs = [resolver.blocDir, resolver.modelsDir, resolver.widgetsDir];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

function createCubitFiles(resolver: CubitPathResolver) {
    fs.writeFileSync(resolver.cubitPath, getTemplate(resolver, 'cubit'));
    fs.writeFileSync(resolver.statePath, getTemplate(resolver, 'state'));
    fs.writeFileSync(resolver.uiModelPath, getTemplate(resolver, 'ui_model'));
    fs.writeFileSync(resolver.viewPath, getTemplate(resolver, 'view'));
}

class CubitPathResolver {
    public readonly parentDir: string;
    public readonly cubitNameSnakeCase: string;
    public readonly cubitNamePascalCase: string;
    
    public readonly blocDir: string;
    public readonly modelsDir: string;
    public readonly widgetsDir: string;

    public readonly cubitPath: string;
    public readonly statePath: string;
    public readonly uiModelPath: string;
    public readonly viewPath: string;

    public readonly viewName: string;
    public readonly cubitName: string;
    public readonly stateName: string;

    constructor(parentPath: string, cubitName: string) {
        this.parentDir = parentPath;
        this.cubitNameSnakeCase = cubitName;
        this.cubitNamePascalCase = changeCase.pascalCase(cubitName);

        this.blocDir = path.join(this.parentDir, 'bloc');
        this.modelsDir = path.join(this.parentDir, 'models');
        this.widgetsDir = path.join(this.parentDir, 'widgets');

        this.cubitPath = path.join(this.blocDir, `${this.cubitNameSnakeCase}_cubit.dart`);
        this.statePath = path.join(this.blocDir, `${this.cubitNameSnakeCase}_state.dart`);
        this.uiModelPath = path.join(this.modelsDir, `${this.cubitNameSnakeCase}_ui_model.dart`);
        this.viewPath = path.join(this.widgetsDir, `${this.cubitNameSnakeCase}_view.dart`);

        this.cubitName = `${this.cubitNamePascalCase}Cubit`;
        this.stateName = `${this.cubitNamePascalCase}State`;
        this.viewName = `${this.cubitNamePascalCase}View`;
    }

    private get libDir(): string {
        const libIndex = this.parentDir.indexOf('lib');
        if (libIndex === -1) throw new Error('無法找到 "lib" 目錄');
        return this.parentDir.substring(libIndex + 'lib'.length + 1);
    }

    public getImportPath(fileType: 'cubit' | 'state' | 'ui_model' | 'view'): string {
        switch (fileType) {
            case 'cubit':
                return `package:${APP.flutterLibName}/${path.join(this.libDir, 'bloc', `${this.cubitNameSnakeCase}_cubit.dart`).replace(/\\/g, '/')}`;
            case 'state':
                return `package:${APP.flutterLibName}/${path.join(this.libDir, 'bloc', `${this.cubitNameSnakeCase}_state.dart`).replace(/\\/g, '/')}`;
            case 'ui_model':
                 return `package:${APP.flutterLibName}/${path.join(this.libDir, 'models', `${this.cubitNameSnakeCase}_ui_model.dart`).replace(/\\/g, '/')}`;
            case 'view':
                 return `package:${APP.flutterLibName}/${path.join(this.libDir, 'widgets', `${this.cubitNameSnakeCase}_view.dart`).replace(/\\/g, '/')}`;
        }
    }
}

// #region Templates

function getTemplate(resolver: CubitPathResolver, templateName: 'cubit' | 'state' | 'ui_model' | 'view'): string {
    const templates: { [key: string]: (r: CubitPathResolver) => string } = {
        'cubit': getCubitTemplate,
        'state': getStateTemplate,
        'ui_model': getUiModelTemplate,
        'view': getViewTemplate,
    };

    const templateFunc = templates[templateName];
    if (!templateFunc) {
        throw new Error(`Template '${templateName}' not found.`);
    }
    return templateFunc(resolver);
}

function getCubitTemplate(r: CubitPathResolver): string {
    return `
import 'package:bloc/bloc.dart';
import '${r.getImportPath('state')}';
import '${r.getImportPath('ui_model')}';

class ${r.cubitName} extends Cubit<${r.stateName}> {
  ${r.cubitName}() : super(const ${r.stateName}.initial());

  Future<void> fetch() async {
    emit(const ${r.stateName}.loading());
    try {
      // Placeholder implementation:
      await Future.delayed(const Duration(seconds: 1));
      emit(${r.stateName}.success(data: ${r.cubitNamePascalCase}UiModel(id: '1', name: '範例資料')));
    } catch (e) {
      emit(${r.stateName}.failure(e.toString()));
    }
  }
}
`;
}

function getStateTemplate(r: CubitPathResolver): string {
    const uiModelName = `${r.cubitNamePascalCase}UiModel`;
    return createFreezedTemplate({
        className: r.stateName,
        imports: [
            'package:freezed_annotation/freezed_annotation.dart',
            r.getImportPath('ui_model'),
        ],
        parts: [`${r.cubitNameSnakeCase}_state.freezed.dart`],
        classContent: `
  const factory ${r.stateName}.initial() = _Initial;
  const factory ${r.stateName}.loading() = _Loading;
  const factory ${r.stateName}.success({required ${uiModelName} data}) = _Success;
  const factory ${r.stateName}.failure(final String message) = _Failure;
`
    });
}

function getUiModelTemplate(r: CubitPathResolver): string {
    const className = `${r.cubitNamePascalCase}UiModel`;
    return createFreezedTemplate({
        className: className,
        imports: ['package:freezed_annotation/freezed_annotation.dart'],
        parts: [
            `${r.cubitNameSnakeCase}_ui_model.freezed.dart`,
            `${r.cubitNameSnakeCase}_ui_model.g.dart`
        ],
        classContent: `
  factory ${className}({
    String? id,
    String? name,
  }) = _${className};
`,
        includeFromJson: true,
    });
}

function getViewTemplate(r: CubitPathResolver): string {
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
          initial: () => const Center(child: Text('Initial State')),
          loading: () => const Center(child: CircularProgressIndicator()),
          success: (data) => Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text('ID: \${data.id ?? ''}'),
                Text('Name: \${data.name ?? ''}'),
              ],
            ),
          ),
          failure: (message) => Center(child: Text('Error: $message')),
        );
      },
    );
  }
}
`;
}

// #endregion

// Helper function to create a freezed template
function createFreezedTemplate({
    className,
    imports = [],
    parts = [],
    classContent,
    includeFromJson = false,
}: {
    className: string;
    imports?: string[];
    parts?: string[];
    classContent: string;
    includeFromJson?: boolean;
}): string {
    const importStatements = imports.map(i => `import '${i}';`).join('\n');
    const partStatements = parts.map(p => `part '${p}';`).join('\n');

    let template = `
${importStatements}

${partStatements}

@freezed
class ${className} with _\$${className} {
  ${classContent}
`;

    if (includeFromJson) {
        template += `
  factory ${className}.fromJson(Map<String, dynamic> json) => _\$${className}FromJson(json);
`;
    }

    template += `}
`;
    return template;
}
