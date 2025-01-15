# 0.0.152
- [Update] Create flutter page with auto Route

# 0.0.151
- [Update] Renamed `PngImage`/`SvgIcon` enums to `PngAssets`/`SvgAssets` in 

# 0.0.150
- [Update] Clean architecture pattern add "await Future.delayed(const Duration(seconds: 1));" in pattern

# 0.0.149
- [Update] Dart Asset Transformer rename  "withVectorGraphics" => "toVectorGraphicsWidget"

# 0.0.148
- [Feature] Auto complete "final log" => "final log = Logger($name)"

# 0.0.147
- [Update] Clean architecture pattern,more easy to use

# 0.0.145
- [Bugfix] generate_route_temp

# 0.0.144
- [Bugfix] Clean architecture pattern,rename state name in "widget.dart"

# 0.0.143
- [Update] Clean architecture pattern,add safe area in "page.dart"

# 0.0.142
- [Update] Make Export String to l10n resource more useful

# 0.0.139
- [Bugfix] Clean architecture pattern,add blocProvider

# 0.0.138
- [Update] Make Export String to l10n resource more useful

# 0.0.137
- [Feature] Update clean architecture pattern,inject cubit with blocConsumer

# 0.0.133
- [Feature] Export String to l10n resource

# 0.0.132
- [Refactor] more readable Clean architecture name

# 0.0.131
- Clean architecture with cubit

# 0.0.130
- Add cubit auto complete fit more case
- Auto register route

# 0.0.129
- Add cubit auto complete

# 0.0.127
- Refactor Asset image Generate to Dart Asset Transformer

# 0.0.119
- Asset image Generate  only show menu when right-click when folder name is 'images'
- Generate Clean Architecture folder only show menu when right-click when folder name is 'features'


# 0.0.114
- Work with https://marketplace.visualstudio.com/items?itemName=jackFan.lazy-jack-flutter-logger-easy-life
- https://pub.dev/packages/color_observer_logger 
- https://pub.dev/packages/color_logging

# 0.0.110
- Check conflict when merge --no -ff


# 0.0.107
- Sidebar/Flutter/update git dependencies action support hide branch 
- refactor key from  hideUpdate: [test,dev] to skipBranch: [test,dev]
```
if use flutter git repo as dependencies, you can hide branch in the sidebar with 
    // pubspec.yaml
    flutter_lazy_j_tools:
        git:
            url: url
            ref: main
            // this only support on my extension  Sidebar  action "Sidebar/Flutter/update git dependencies"
            skipBranch: [test,dev]
``` 

# 0.0.106
- Add Convert file : ${filePath} to dart interface template when open , save ,or select part of context then quick fix
- depencency on https://pub.dev/packages/graphql_codegen

# 0.0.104
- Add auto running 'flutter gen-l10n' when ".arb" file save

# 0.0.103
- Add git scripts for merge, checkout, and create branch in Sidebar/Git

# 0.0.102
- support module update when project open (popup in dialog)

# 0.0.101
- Sidebar/Flutter/update git dependencies action support hide branch
```
if use flutter git repo as dependencies, you can hide branch in the sidebar with 
    // pubspec.yaml
    flutter_lazy_j_tools:
        git:
            url: url
            ref: main
            // this only support on my extension  Sidebar  action "Sidebar/Flutter/update git dependencies"
            hideUpdate: [test,dev]
``` 

# 0.0.100
- Add qraphql to dart api template code action for quick fix 

# 0.0.99
- Rename architecture pattern main file class name 

# 0.0.98
- Update placeholder text for feature name input box

# 0.0.97
- Add feature generation clean architecture pattern when right click on folder

# 0.0.96
- feature redirect to local branch when use open github sidebar ui 