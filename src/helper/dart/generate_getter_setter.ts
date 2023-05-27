// import * as vscode from 'vscode';
// const command_dart_generate_getter_setter = "command_dart_generate_getter_setter"
// const blocBuilderSnippet = (widget: string) => {
//     return `BlocBuilder<\${1:Subject}\${2|Bloc,Cubit|}, $1State>(
//     builder: (context, state) {
//       return ${widget};
//     },
//   )`;
//   };

// export function registerGenerateGetterSetter(context: vscode.ExtensionContext) {
//     // context.subscriptions.push(vscode.commands.registerCommand(command_dart_generate_getter_setter, async () => {
//     //     wrapWith(blocBuilderSnippet)
//     // }));
// }
// let s :string;
// let setter:string;

// function generator() {
//     const editor = vscode.window.activeTextEditor;
//     s=''
//     setter=''
//     let arr: string[] = [];
//     if (!editor)
//         return;
//     const selection = editor.selection;
//     let text = editor.document.getText(selection);
//     if (text.length < 1) {
//         vscode.window.showErrorMessage('No selected properties.');
//         return;
//     }
//     let properties = text.split(/\r?\n/).filter(x => x.length > 2).map(x => x.replace(';', ''));
//     let generatedMethods: string[] = [];
//     for (let p of properties) {
//         console.log(p)
//         generatedMethods = generateGetterAndSetter(p, s, setter, arr);
//     }
//     editor.edit(
//         edit => editor.selections.forEach(
//             selection => {
//                 edit.insert(selection.end, generatedMethods.join("\n"));
//             }
//         )
//     );
// }

// function generateGetterAndSetter(prop: string, s: string, setter: string, arr: string[]): string[] {
//     const editor = vscode.window.activeTextEditor;
//     let isFinal = false
//     let start = 0;
//     for (let s of prop) {
//         if (s != " ") {
//             start = prop.indexOf(s)
//             break
//         }
//     }
//     prop = prop.slice(start)
//     let type = prop.split(" ").splice(0)[0];
//     if (type.includes("final")) {
//         isFinal = true
//         type = ''
//         if (!prop.split(" ").splice(0)[2].startsWith("_")) {
//             vscode.window.showErrorMessage(prop + ' no need Setter and Getter');
//             return arr
//         }
//     }
//     if (prop.includes("=")) {
//         prop = prop.substring(0, prop.lastIndexOf("=")).trim()
//     }
//     let variableName = prop.split(" ").slice(-1);
//     let varUpprName = variableName.toString().charAt(0).toUpperCase() + variableName.toString().slice(1);
//     if (prop.includes("_")) {
//         let varLowerName = variableName.toString().charAt(0).toLowerCase() + variableName.toString().slice(1);
//         if (!isFinal) {
//             setter = `\n set ${varLowerName.replace("_", "")}(${type} value) => this.${variableName} = value;`;

//         }
//         s = `\n ${type} get ${varLowerName.replace("_", "")} => this.${variableName};`;
//     }
//     else {
//         s = `\n ${type} get get${varUpprName} => this.${variableName};`;
//         if (!isFinal) {
//             setter = `\n set set${varUpprName}(${type} ${variableName}) => this.${variableName} = ${variableName};`;
//         }
//     }
//     let uri = vscode.window.activeTextEditor!.document.getText();
//     if (uri.includes(`=> this.${variableName}`)) {
//         vscode.window.showErrorMessage('Setter and Getter already created.');
//         return [];
//     }
//     arr.push(s, setter);
//     let sets = new Set(arr);
//     let it = sets.values();
//     arr = Array.from(it);
//     return arr;
// }