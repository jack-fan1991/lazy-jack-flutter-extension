import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as changeCase from "change-case";
import { getRootPath } from '../../../utils/src/vscode_utils/vscode_env_utils';
import { openEditor, readFileToText } from '../../../utils/src/vscode_utils/editor_utils';
import { reFormat } from '../../../utils/src/vscode_utils/activate_editor_utils';
import { runTerminal } from '../../../utils/src/terminal_utils/terminal_utils';

const command_create_go_route_configuration = "command_create_go_route_configuration";

function runBuildRunner() {
  runTerminal(`flutter pub run build_runner build `);
}

export function registerCreateGoRouteConfiguration(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(command_create_go_route_configuration, async (routeName: string, routePath: string, importText: string, widgetName: string) => {
        let root = getRootPath();
        const routeDir = `${root}/lib/route`;
        const filePath = `${routeDir}/go_router_config.dart`;

        if (!fs.existsSync(routeDir)) {
            fs.mkdirSync(routeDir, { recursive: true });
        }

        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, createGoRouteConfigurationInitial(routeName, routePath, importText, widgetName));
            reFormat();
            openEditor(filePath);
            return;
        }

        let text = readFileToText(filePath);
        let lines = text.split('\n');
        let newLines: string[] = [];

        let importAdded = false;
        let routeConstAdded = false;
        let goRouteAdded = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('import ') && !importAdded) {
                let j = i;
                while (j < lines.length && lines[j].startsWith('import ')) {
                    newLines.push(lines[j]);
                    j++;
                }
                const importExists = lines.slice(i, j).some(l => l.trim() === importText.trim());
                if (!importExists) {
                    newLines.push(importText);
                }
                importAdded = true;
                i = j - 1;
            } else if (line.includes('// --- Route constants ---') && !routeConstAdded) {
                newLines.push(line);
                const newRouteConst = `const String ROUTE_${changeCase.constantCase(routeName)} = ${routePath};`;
                let constExists = false;
                for (let k = i + 1; k < lines.length; k++) {
                    if (lines[k].trim().startsWith('const String') && lines[k].includes(newRouteConst.split('=')[0].trim())) {
                        constExists = true;
                        break;
                    }
                    if (lines[k].includes('// --- GoRouter instance ---')) break;
                }
                if (!constExists) {
                    newLines.push(newRouteConst);
                }
                routeConstAdded = true;
            } else if (line.trim().startsWith('routes: [') && !goRouteAdded) {
                newLines.push(line);
                let bracketLevel = 1;
                let routeListEndIndex = -1;
                for (let k = i + 1; k < lines.length; k++) {
                    for (const char of lines[k]) {
                        if (char === '[') bracketLevel++;
                        if (char === ']') bracketLevel--;
                    }
                    if (bracketLevel === 0 && lines[k].includes(']')) {
                        routeListEndIndex = k;
                        break;
                    }
                }

                if (routeListEndIndex !== -1) {
                    const newGoRoute = temGoRoute(routeName, routePath, widgetName);
                    let goRouteExists = false;
                    const currentRoutesBlock = lines.slice(i + 1, routeListEndIndex).join('\n');
                    if (currentRoutesBlock.includes(`path: ROUTE_${changeCase.constantCase(routeName)}`)) {
                        goRouteExists = true;
                    }

                    if (!goRouteExists) {
                        const lastRouteLine = lines[routeListEndIndex - 1].trim();
                        newLines.push(...lines.slice(i + 1, routeListEndIndex - 1));
                        if (!lastRouteLine.endsWith(',')) {
                            newLines.push(lines[routeListEndIndex - 1] + ',');
                        } else {
                            newLines.push(lines[routeListEndIndex - 1]);
                        }
                        newLines.push(newGoRoute.split('\n').map(l => `    ${l}`).join('\n'));
                    } else {
                        newLines.push(...lines.slice(i + 1, routeListEndIndex));
                    }

                    newLines.push(lines[routeListEndIndex]);
                    i = routeListEndIndex;
                    goRouteAdded = true;
                } else {
                    newLines.push(line);
                }
            } else {
                newLines.push(line);
            }
        }

        // 若某段落未加入成功，則補上
        if (!importAdded) {
            newLines.unshift(importText);
        }
        if (!routeConstAdded) {
            newLines.push('// --- Route constants ---');
            newLines.push(`const String ROUTE_${changeCase.constantCase(routeName)} = ${routePath};`);
        }
        if (!goRouteAdded) {
            newLines.push('routes: [');
            newLines.push(`${temGoRoute(routeName, routePath, widgetName)}`);
            newLines.push(']');
        }

        fs.writeFileSync(filePath, newLines.join('\n'));
        await  openEditor(filePath);
        setTimeout(() => {
            reFormat();
        }, 300);
    }));
}

function createGoRouteConfigurationInitial(routeName: string, routePath: string, importText: string, widgetName: string): string {
    return `
// Auto-Generated File by Lazy Jack VSCode Extension

// - [Install Extension](https://marketplace.visualstudio.com/items?itemName=jackFan.lazy-jack)
// - [Read More](https://github.com/jack-fan1991/lazy-jack-flutter-extension)

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
${importText}
// --- Route constants ---
const String ROUTE_${changeCase.constantCase(routeName)} = ${routePath};

// --- GoRouter instance ---
final router = GoRouter(
  routes: [
    ${temGoRoute(routeName, routePath, widgetName)}
  ],
  errorBuilder: (context, state) => Scaffold(
    body: Center(
      child: Text('Page not found'),
    ),
  ),
);
`.trimStart();
}

function temGoRoute(routeName: string, routePath: string, widgetName: string): string {
    return `
    GoRoute(
      name: '${routeName}',
      path: ROUTE_${changeCase.constantCase(routeName)},
      builder: (context, state) => ${widgetName}(),
    )`.trim();
}

