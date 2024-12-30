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
- Refactor Assert image Generate to Dart Asset Transformer

# 0.0.119
- Assert image Generate  only show menu when right-click when folder name is 'images'
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