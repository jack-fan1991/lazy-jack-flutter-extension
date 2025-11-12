# Feature 
## Most of feature is support on MacOs
## New 

  ##### Export String to tree view and fix action
  * [ReadMore](./doc/l10n_tree.md)

  ##### Export String to l10n resource
  * [ReadMore](./doc/l10n.md)


  #### Clean architecture with cubit
   * [ReadMore](./doc/clean_architecture.md)
   
  | Support Fold name  | Image                                           |
  |---------------|-------------------------------------------------|
  | **features** | ![](./image/clean_architecture/support_features.png)    |
  | **pages** | ![](./image/clean_architecture/support_pages.png)    |
  | **File tree** | ![](./image/clean_architecture/tree.png)       |
  
  | Feature | Image                                           |
  |---------------|-------------------------------------------------|
  | **Add sub view** | ![](./image/clean_architecture/add_cubit.png)    |
  | **Register Route** | ![](./image/clean_architecture/auto_route.png)    |

### ✨ 產生的模組結構範例

#### 1. 完整功能模組 (包含UI層)

當您透過右鍵選單 `Clean Architecture: Generate Feature` 產生一個新的功能模組（例如輸入 `user_profile`），此擴充功能會建立以下完整的目錄與檔案結構：

```markdown
user_profile/
├── data/
│   ├── sources/
│   │   ├── user_profile_data_source.dart
│   │   └── user_profile_remote_data_source_impl.dart
│   ├── models/
│   │   └── user_profile_model.dart
│   └── repo_impls/
│       └── user_profile_repository_impl.dart
├── di/
│   └── injection.dart
├── domain/
│   ├── entities/
│   │   └── user_profile_entity.dart
│   ├── repositories/
│   │   └── user_profile_repository.dart
│   └── usecases/
│       └── get_user_profile.dart
└── presentation/
    ├── bloc/
    │   ├── user_profile_cubit.dart
    │   └── user_profile_state.dart
    ├── models/
    │   └── user_profile_ui_model.dart
    ├── pages/
    │   └── user_profile_page.dart
    └── widgets/
        └── user_profile_view.dart
```
這個標準化的結構可以確保您專案中所有功能的一致性以及關注點分離。

#### 2. 資料/邏輯模組 (無UI層)

當您透過右鍵選單 `Clean Architecture: Generate Module Template` 產生一個純資料/邏輯模組（例如輸入 `transaction`），則會建立一個不含 `presentation` 層的精簡結構，適合用來封裝共享的業務邏輯：

```markdown
transaction/
├── data/
│   ├── sources/
│   │   ├── transaction_data_source.dart
│   │   └── transaction_remote_data_source_impl.dart
│   ├── models/
│   │   └── transaction_model.dart
│   └── repo_impls/
│       └── transaction_repository_impl.dart
├── domain/
│   └── repositories/
│       └── transaction_repository.dart
└── transaction_module.dart
```

  #### 模組資料層方法產生器 (Add Module Method)
  * 於 `lib/modules/<feature>` 右鍵點選 `✨ Add Module Method` 後，輸入方法名稱，外掛會依命名推斷是否為寫操作：
    - 以 `create`、`add`、`update`、`delete`、`remove`、`send`、`post`、`put`、`patch` 開頭者視為寫操作，回傳 `Future<Result<void>>`。
    - 其餘視為讀取操作，會自動建立 `data/models/<method>_data.dart` 並回傳 `Future<Result<NewModel>>`。
  * 指令會同步更新下列檔案並補上必要 `import`：
    - `domain/repositories/<feature>_repository.dart`
    - `data/sources` 或 `data/sources` 內的 data source 與其實作
    - `data/repositories` 或 `data/repo_impls` 內的 repository impl，包括 mock 版本（若存在）
  * 建議事前確認模組資料夾符合 sample 中的結構 (`domain/repositories`、`data/sources`、`data/repositories` 或 `data/repo_impls`、`data/models`)。

  * 如需客製回傳包裹型別，可在 VS Code 設定 (`settings.json`) 中加入：
    ```json
    {
      "lazy-jack-flutter-extension.resultWrapper": {
        "name": "Result",
        "import": "package:owlcash_core/common/result.dart"
      }
    }
    ```
    - `name`：外層容器類別名稱。
    - `import`：可填 `import '...' ;` 或純路徑，外掛會自動補齊語法。
    - 若未設定，讀取方法預設回傳 `Future<NewModel?>`，寫入方法回傳 `Future<void>`。
    - 舊設定鍵 `lazy-jack-flutter-extension.dataReturnWrapper` 仍會被辨識，但建議改用新的 `resultWrapper`。

  * Cubit Quick Fix 亦可依需求提供多種替換方案，於 `settings.json` 加入：
    ```json
    {
      "lazy-jack-flutter-extension.customCubit": [
        {
          "name": "BetterCubit",
          "import": "package:mobile_core/better_cubit.dart"
        },
        {
          "name": "FlowCubit",
          "import": "import 'package:flow_core/flow_cubit.dart';"
        }
      ]
    }
    ```
    - `name`：Quick Fix 會顯示的自訂 Cubit 類別名稱。
    - `import`：可填完整 `import '...';` 或純路徑，外掛會自動補齊語句並避免重覆插入。
    - 可建立多個項目，Quick Fix 會同時列出所有自訂 Cubit 供選擇。


  #### Dart Asset Transformer
  * [ReadMore](./doc/assets_creator.md)
 
 | Support Fold name  | Image                                           |
 |---------------|-------------------------------------------------|
 | **images** | ![](./image/assets_creator/support_png.png)    |
 | **svg** | ![](./image/assets_creator/support_svg.png)    |
 | **File Tree** | ![](./image/assets_creator/all_data.png)       |
 | **File Tree** | lib/assets ![](./image/assets_creator/create.png)    
 
 

  - Generate Clean Architecture folder only show menu when right-click when folder name is 'features'


  * [Vscode extension flutter logger easy life](https://marketplace.visualstudio.com/items?itemName=jackFan.lazy-jack-flutter-logger-easy-life)

  * without extension
  ![](./image/logger/color_looger_bad1.png)
  ![](./image/logger/color_looger_bad2.png)

  * with extension you can tap absolute path to code line position
  ![](./image/logger/color_looger_good1.png)
  ![](./image/logger/color_looger_good2.png)




## Old feature



  * String format (onSelected)
  
    ![](./image/quickfix/string_format.png)
  * Freezed quick fix

    ![](./image/quickfix/freezed/freezed_class_q_fix.png)
  * Extract class to file

    ![](./image/quickfix/class/excract_class.png)

#### freezed 
  * Create freezed

    ![](./image/menu/freezed_menu.png)


#### Json to freezed

  ![](./image/quickfix/json_to_freezed.png)
  
  * Menu

    ![](./image/quickfix/freezed/json_to_freezed.png)

  * Convert to freezed Result
    ```dart 
    import 'package:freezed_annotation/freezed_annotation.dart';
    part 'test_api.g.dart';
    part 'test_api.freezed.dart';

    @freezed
    class TestApi with _$TestApi {
      const TestApi._();
      const factory TestApi({
        final User? user,
        final Location? location,
        @Default([]) final List<String> devices,
        @Default([]) final List<Devices2> devices2,
      }) = _TestApi;
      factory TestApi.fromJson(Map<String, dynamic> json) =>
          _$TestApiFromJson(json);
    }

    @freezed
    class Devices2 with _$Devices2 {
      const Devices2._();
      const factory Devices2({
        final String? logo,
      }) = _Devices2;
      factory Devices2.fromJson(Map<String, dynamic> json) =>
          _$Devices2FromJson(json);
    }

    @freezed
    class Location with _$Location {
      const Location._();
      const factory Location({
        final String? city,
        final String? state,
        final int? zipcode,
      }) = _Location;
      factory Location.fromJson(Map<String, dynamic> json) =>
          _$LocationFromJson(json);
    }

    @freezed
    class User with _$User {
      const User._();
      const factory User({
        final Name? name,
        final int? age,
        final String? email,
      }) = _User;
      factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
    }

    @freezed
    class Name with _$Name {
      const Name._();
      const factory Name({
        final String? first,
        final String? last,
      }) = _Name;
      factory Name.fromJson(Map<String, dynamic> json) => _$NameFromJson(json);
    }


    ```


#### QuickFix part of
* Use quick fix to add "part of" or "part of "

  ![](./image/quickfix/part_of_error.png)

  ![](./image/quickfix/part_of_quick_fix_action.png)

  ![](./image/quickfix/part_of_quick_fix_done.png)

#### SideBar GUI

![Before](./image/sideBar.png)
