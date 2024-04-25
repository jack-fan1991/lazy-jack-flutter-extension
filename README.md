# Feature 
## Most of feature is support on MacOs
## New 

  * [Vscode extension flutter logger easy life](https://marketplace.visualstudio.com/items?itemName=jackFan.lazy-jack-flutter-logger-easy-life)

  * without extension
  ![](./image/logger/color_looger_bad1.png)
  ![](./image/logger/color_looger_bad2.png)

  * with you can tap absolute path to code line
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

#### Assert image Generate
* Right click on folder will show "Generate assert file from folder"
  * support "png", "svg"
  * Generate file in "lib/const/folderName_images_supportType.lazyjack.dart"

    ![](./image/menu/assert_extension.png)
* Svg template
```dart
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
enum SvgIcon {
  applePay('assets/images/apple_pay.svg'),
  final String path;
  const SvgIcon(this.path);
  
  Widget toIcon({double? width, double? height,Color? color}) => SvgPicture.asset(
    path,
    width: width,
    height: height,
    color:color
  );
}
```
* How to Use 

```dart
SvgIcon.applePay.toIcon(width: 20,height: 20,color: Colors.red)
```

* Png template

```dart
import 'package:flutter/material.dart';
  
enum PngImage {
  googlePay('assets/images/google_pay.png'),

  final String path;
  const PngImage(this.path);
  
  Widget toImage({
    double? width,
    double? height,
    Color? color,
    ImageFrameBuilder? frameBuilder,
    ImageErrorWidgetBuilder? errorBuilder,
    String? semanticLabel,
    bool excludeFromSemantics = false,
    double? scale,
    BlendMode? colorBlendMode,
    BoxFit? fit,
    AlignmentGeometry alignment = Alignment.center,
    ImageRepeat repeat = ImageRepeat.noRepeat,
    Rect? centerSlice,
    bool matchTextDirection = false,
    bool gaplessPlayback = false,
    bool isAntiAlias = false,
    String? package,
    FilterQuality filterQuality = FilterQuality.low,
    int? cacheWidth,
    int? cacheHeight,
  }) =>
      Image.asset(
        path,
        width: width,
        height: height,
        color: color,
        frameBuilder: frameBuilder,
        errorBuilder: errorBuilder,
        semanticLabel: semanticLabel,
        excludeFromSemantics: excludeFromSemantics,
        scale: scale,
        colorBlendMode: colorBlendMode,
        fit: fit,
        alignment: alignment,
        repeat: repeat,
        centerSlice: centerSlice,
        matchTextDirection: matchTextDirection,
        gaplessPlayback: gaplessPlayback,
        isAntiAlias: isAntiAlias,
        package: package,
        filterQuality: filterQuality,
        cacheWidth: cacheWidth,
        cacheHeight: cacheHeight,
      );
}
```
* How to Use 

```dart
PngImage.googlePay.toImage(width: 20,height: 20,color: Colors.red)
```

#### QuickFix part of
* Use quick fix to add "part of" or "part of "

  ![](./image/quickfix/part_of_error.png)

  ![](./image/quickfix/part_of_quick_fix_action.png)

  ![](./image/quickfix/part_of_quick_fix_done.png)

#### SideBar GUI

![Before](./image/sideBar.png)


