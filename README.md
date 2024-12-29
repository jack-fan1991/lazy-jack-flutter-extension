# Feature 
## Most of feature is support on MacOs
## New 

  #### Clean architecture with cubit
   * [ReadMore](./doc/clean_architecture.md)
   
  | Support Fold name  | Image                                           |
  |---------------|-------------------------------------------------|
  | **features** | ![](./image/clean_architecture/support_features.png)    |
  | **pages** | ![](./image/clean_architecture/support_pages.png)    |
  | **File tree** | ![](./image/clean_architecture/tree.png)       |
  
  | Feature | Image                                           |
  |---------------|-------------------------------------------------|
  | **Add cubit** | ![](./image/clean_architecture/add_cubit.png)    |
  | **Register Route** | ![](./image/clean_architecture/auto_route.png)    |


  #### Dart Asset Transformer
  * [ReadMore](./doc/assets_creator.md)
 
 | Support Fold name  | Image                                           |
 |---------------|-------------------------------------------------|
 | **images** | ![](./image/assets_creator/support_png.png)    |
 | **svg** | ![](./image/assets_creator/support_svg.png)    |
 | **File Tree** | ![](./image/assets_creator/all_data.png)       |
 | **File Tree** | lib/asserts ![](./image/assets_creator/create.png)    
 
 

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


