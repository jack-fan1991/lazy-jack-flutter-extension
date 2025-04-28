# 0.0.181
- [Feature] Flutter l10n Helper , add Disable button

# 0.0.178
- [Feature] Git submodule auto fetch detector

# 0.0.177
- [Feature] l10n 
- Rename Flutter l10n Helper
- Support clear, dir filter

# 0.0.176
- [Feature] l10n 
- Rename Flutter l10n Helper
- Support clear, dir filter

# 0.0.175
- [Feature] l10n 
- Use l10n todo refresh to enable Autofix

# 0.0.174
- [Feature] l10n 
- support find all unlocated strings

# 0.0.173
- [Feature] l10n tree view

# 0.0.171
- [Bugfix] l10nFix
- support l18n keys auto sort

# 0.0.168
- [Bugfix] Sidebar
- Register Copilot Commit setting


# 0.0.165
- [Bugfix] Fix Dart assert transformer

# 0.0.160
- [Feature] .arb key auto sort

# 0.0.159
- [Bugfix] dart file part fixer
- fix part insert index error

# 0.0.157
- [Feature]  dart file part fixer
- move "class FOO" as "part of" file and auto import

# 0.0.156
- [Feature]  Sidebar create branch
- add CI 
- support  [ feature | bugfix | refactor | patch | chore | ci]

# 0.0.154
- [Feature]  Sidebar
- add create branch => [CMD] : git branch feature/$user/$featureName 
- support  [ feature | bugfix | refactor | patch | chore ]


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