import * as vscode from 'vscode';
import { registerAddBlocWidget } from './generate_clean_architecture_bloc_widget';
import { registerAddDataSourceMethod } from './add_data_source_method';
import { registerCleanArchitectureGenerate } from './generate_clean_architecture_feature';
import { registerCleanArchitecturePageGenerate } from './generate_clean_architecture_page';
import { registerCustomCubitCodeLensFix } from './custom_cubit_code_lens_fix';

export function registerCleanArchitectureGenerateModule(context: vscode.ExtensionContext) {
    registerCleanArchitectureGenerate(context);
    registerCleanArchitecturePageGenerate(context);
    registerAddBlocWidget(context);
    registerAddDataSourceMethod(context);
    registerCustomCubitCodeLensFix(context);
}
