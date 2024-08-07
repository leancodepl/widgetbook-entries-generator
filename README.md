# Widgetbook Generator

## Overview

A [VSCode](https://code.visualstudio.com/) extension which helps you automate the process of adding new widget entries for [Widgetbook](https://www.widgetbook.io/) - a widget library for Flutter.

## Features

The extension allows you to generate a base for widgetbook use-cases for a chosen widget (or for the whole directory of widgets). It will go through the widget, and for every constructor it will create a widgetbook use case. All those use cases will be put in one file which should be a representation of a chosen widget in the widgetbook. For each constructor property the extension will try to find the most suitable knob.

There is a set of predefined type-knob pairs. You can also **configure your own knobs** (see [Custom Knobs](#custom-knobs)) and override existing ones. If none of defined types matches the property, it's assumed the property is a custom enum (so `list` knob will be used).

**NOTE:** The code generated by the extension should always be revised and corrected where needed. The extension is just supposed to provide a solid base for further adjustments, do the job of writing repeatable, schematic code.

![demo](https://raw.githubusercontent.com/FirentisTFW/widgetbook-entries-generator/main/demo_gifs/generate_widgetbook_entry_preview.gif)

## Installation

The extension can be installed from the [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=LeanCode.widgetbook-generator).

## Configuration

A couple of settings need to be specified for the extension to work. They can be set in VSCode Settings after typing "widgetbook" in the searchbar.

- **Approach** - the Widgetbook approach you want to use. Can be set to _Manual_ or _Generation_. In _Manual_ approach you'll need to add widgets to the Widgetbook manually, in Generation _approach_ `build_runner` will do that for you.
- **Widgetbook Version** - should be set as the same version you use in your `pubspec.yaml` file.
- **Widgets Directory Path** - a directory in which you want to create new widgetbook entries. Whenever you use the extension to generate an entry for the widget, the generated file will be placed in this directory. The path is relative to the directory you have open in the VSCode.
- **Root Directory Name** - root name of the directory you have open in the VSCode. It's shown by default on the VSCode's app bar or on top of the file explorer tab. It's needed to correctly generate widgetbook path.
- **Barrel File Import** - the file which exports all your custom widgets. E.g. `package:my_common_ui/widgets.dart`. If you don't use a barrel file for exporting your widgets, you can leave this setting empty, you'll need to add proper imports manually then.
- **Number Knob Type** - the type of knob that will be used for numeric fields. Can be `Input` or `Slider`.
- **Custom Knobs Path** - path to the file which contains your custom knobs (see more in [Custom Knobs](#custom-knobs)). Leave this setting empty if you don't want to provide custom knobs.

Those settings are purely project specific. If you work on multiple projects at the same time and all of them use widgetbook, you can override above settings for each of them. Just create `settings.json` file under `.vscode` directory in your project. You can override specific settings there just for the current workspace:

```json
{
  "widgetbook-generator.rootDirectoryName": "another-project",
  "widgetbook-generator.widgetbookVersion": "3.2.0"
}
```

## Usage

Before using the extension to generate files, make sure you've configured your extension before by following steps described in [Configuration](#configuration). Also, make sure the code meets the [requirements](#requirements).

### Generating Widgetbook Entries for a Single Widget

Put the cursor on the line with class name declaration, press a shortcut for `Quick Fix` action (by default `Ctrl+.` on Windows/Linux and `Cmd+.` on macOS), then select option `Create widgetbook entry for this widget`.

### Generating Widgetbook Entries for the Entire Widget Directory

In VSCode explorer, right-click on the directory that contains widgets for which you want to generate entries, then select `Widgetbook: generate entry for each file in the directory`. The extension will generate a new file with widgetbook entries for each of the files in the directory. If the directory contains subdirectories, the extension will also generate entries for them

**Note**: This feature is currently experimental and may require adjustments. We're working on making it stable.

## Custom Knobs

The extension allows for adding custom knobs for specified types (e.g. your custom widgets/enums that you want to handle differently). These custom knobs can also override knobs predefined by the extension.

To define custom knobs, create a JSON file containing your knobs, and set the **Custom Knob Path** property from [Configuration](#configuration) section. Your JSON structure should look like this:

```json
[
  {
    "type": "Duration",
    "nullability": "both", // can be any of: "nonNullable", "nullable", "both"
    "value": "context.knobs.duration(label: '$fieldName')" // $fieldName will be replaced by the actual name of the field when generating the use-case
  }
  // other custom knobs
]
```

## Notes

This project is still in very early stage of development. If you find that something is not working properly or you think some features are missing, feel free to create an issue or even a pull request.

**Disclaimer**: This is not an official Widgetbook extension. It's made and maintained by the community.

## Requirements

Since the project is still in very early stage of development, some rules need to be followed for the extension to work correctly.

1. File must be formatted when generating entries (using `dart format`). VSCode often does this for you when you save the file (if you have _Format On Save_ option selected).

2. Trailing commas in widget constructors must be used.

   Good:

   ```dart
   const Button({
       super.key,
       required this.label,
       required this.icon,
       this.onTap,
   });
   ```

   Bad:

   ```dart
   const Button(
       {super.key,
       required this.label,
       required this.icon,
       this.onTap});
   ```

   ```dart
   const Button({super.key, required this.onTap, required this.label});
   ```

3. Code must use 2 spaces for indents (this is a default setting in Flutter).
