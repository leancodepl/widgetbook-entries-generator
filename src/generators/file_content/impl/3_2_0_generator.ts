import { camelCase, pascalCase } from "change-case";
import { Configuration } from "../../../configuration/configuration";
import { NumberKnobType } from "../../../configuration/enums/double_knob_type";
import { DartClassConstructor } from "../../../data/dart_class";
import { BaseFileContentGenerator } from "../base_generator";

class FileContentGenerator3_2_0 extends BaseFileContentGenerator {
  applyMigrations(): void {
    this.knobForType.set("double", (fieldName) =>
      this.numberKnob(fieldName, "")
    );
    this.knobForNullableType.set("double", (fieldName) =>
      this.nullableNumberKnob(fieldName, "")
    );
  }

  manualComponentDeclaration(): string {
    // TODO Allow ommiting widget name prefixes
    let output = `
    final ${camelCase(this.clazz.name)}Component = WidgetbookComponent(
      name: '${this.clazz.name}',
      useCases: [
    `;

    for (const constructor of this.clazz.constructors) {
      const useCaseName = this.useCaseName(constructor.name);

      output += `
        WidgetbookUseCase(
          name: '${constructor.useCaseName}',
          builder: ${useCaseName},
        ),`;
    }

    output += `
      ],
    );
    `;

    return output;
  }

  useCaseAnnotation(constructor: DartClassConstructor): string {
    return `
    @${this.widgetbookAnnotation}.UseCase(
        name: '${constructor.useCaseName}',
        type: ${this.clazz.name},
    )
    `;
  }

  useCase(constructor: DartClassConstructor): string {
    const useCaseName = this.useCaseName(constructor.name);
    const fullConstructorName = constructor.named
      ? `${this.clazz.name}.${constructor.name}`
      : this.clazz.name;

    let output = `
    Widget ${useCaseName}(BuildContext context) {
        return ${fullConstructorName}(
    `;

    for (const field of constructor.fields) {
      output += `${field.name}: ${this.knobForField(field)},\n`;
    }

    output += `
        );
    }`;

    return output;
  }

  protected numberKnob(fieldName: string, castSuffix: string): string {
    const knobType = Configuration.numberKnobType();

    switch (knobType) {
      case NumberKnobType.input:
        return `context.knobs.double.input(label: '${fieldName}')${castSuffix}`;
      case NumberKnobType.slider:
        return `context.knobs.double.slider(label: '${fieldName}')${castSuffix}`;
    }
  }
  protected nullableNumberKnob(fieldName: string, castSuffix: string): string {
    const knobType = Configuration.numberKnobType();

    switch (knobType) {
      case NumberKnobType.input:
        return `context.knobs.doubleOrNull.input(label: '${fieldName}')${castSuffix}`;
      case NumberKnobType.slider:
        return `context.knobs.doubleOrNull.slider(label: '${fieldName}')${castSuffix}`;
    }
  }

  private useCaseName(constructorName: string | null): string {
    return `useCase${this.clazz.name}${pascalCase(constructorName ?? "")}`;
  }
}

export { FileContentGenerator3_2_0 };
