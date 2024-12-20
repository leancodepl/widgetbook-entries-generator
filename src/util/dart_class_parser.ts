import {
  DartClass,
  DartClassConstructor,
  DartClassConstructorField,
  DartClassConstructorFieldPositionType,
  DartClassField,
} from "../data/dart_class";

function parseTextToClasses(text: string): Array<DartClass> {
  const lines = text.split("\n").filter((line) => line !== "");

  const classes: Array<DartClass> = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (doesLineContainClassDeclaration(line, lines[i + 1])) {
      const endLineIndex =
        lines.slice(i).findIndex((line) => line.startsWith("}")) + i;

      const classLines = lines.slice(i, endLineIndex);
      const clazz = parseTextToClass(classLines);
      if (clazz) classes.push(clazz);
      i = endLineIndex + 1;
    } else {
      i++;
    }
  }

  return classes;
}

function parseTextToClass(lines: Array<string>): DartClass | null {
  const className = parseLinesToClassName(lines);

  // Discard private widgets.
  if (className === "" || className.startsWith("_")) return null;

  const classFields = parseLinesToClassFields(lines);
  const constructors = parseLinesToConstructors(lines, className, classFields);

  const clazz = new DartClass(className, classFields, constructors);

  return clazz;
}

function parseLinesToClassFields(input: Array<string>): Array<DartClassField> {
  // Two spaces in the beginning - it has to be a class property.
  const classFieldLinePrefix = "  final";

  const lines = removeComments(input);
  const fieldListStartIndex = lines.findIndex((line) =>
    line.startsWith(classFieldLinePrefix)
  );
  if (fieldListStartIndex === -1) return [];

  let fieldListEndIndex = fieldListStartIndex;
  for (let i = fieldListStartIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!doesLookingFurtherMakeSense(line)) break;

    const isClassFieldLine =
      line.endsWith(";") && line.startsWith(classFieldLinePrefix);

    // Class fields can occupy two lines if the field name is long.
    const isPreviousLineUnfinishedClassField =
      lines[i - 1].startsWith(classFieldLinePrefix) &&
      !lines[i - 1].includes(";");

    if (isClassFieldLine || isPreviousLineUnfinishedClassField) {
      fieldListEndIndex = i;
    }
  }

  const fieldListLines = lines
    .slice(fieldListStartIndex, fieldListEndIndex + 1)
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .split(";")
    .filter((line) => line !== "");

  return fieldListLines.map((line) => {
    const lineParts = line.trim().split(" ").slice(1);
    const name = lineParts.pop()?.replace(";", "") ?? "";
    const type = lineParts.join(" ");

    if (type.endsWith("?")) {
      return new DartClassField(name, type.removeTrailing(1), true);
    }

    return new DartClassField(name, type);
  });
}

function parseLinesToClassName(lines: Array<string>): string {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i < lines.length - 1 ? lines[i + 1] : "";

    if (doesLineContainClassDeclaration(line, nextLine)) {
      return line?.split(" ")[1]?.substringUpTo("<") ?? "";
    }
  }

  return "";
}

function parseLinesToConstructors(
  lines: Array<string>,
  className: string,
  classFields: Array<DartClassField>
): Array<DartClassConstructor> {
  const constructors: Array<DartClassConstructor> = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!doesLookingFurtherMakeSense(line)) break;

    if (!isConstructorLine(line, className)) {
      i++;
      continue;
    }

    let openParenthesisCount = 0;

    for (let j = i; j < lines.length; j++) {
      for (const char of lines[j]) {
        if (char === "(") openParenthesisCount++;
        else if (char === ")") {
          openParenthesisCount--;
          // Exit as soon as the initial parenthesis block is closed.
          if (openParenthesisCount == 0) break;
        }
      }
      if (openParenthesisCount > 0 && !lines[j].includes("assert(")) {
        continue;
      }

      const constructorContent = lines.slice(i, j + 1);
      const constructor = parseLinesToConstructor(
        constructorContent,
        className,
        classFields
      );
      if (constructor !== null) constructors.push(constructor);

      i = j + 1;
      break;
    }
  }

  return constructors;
}

function isConstructorLine(line: string, className: string): boolean {
  return (
    !line.includes(`return `) &&
    (line.includes(`${className}(`) ||
      (line.includes(`${className}.`) && line.includes("(")))
  );
}

function parseLinesToConstructor(
  lines: Array<string>,
  className: string,
  allClassFields: Array<DartClassField>
): DartClassConstructor | null {
  if (!lines.length) return null;
  const classFieldReference = "this.";
  let namedParametersStartIndex = lines.findIndex((line) => line.includes("{"));
  if (namedParametersStartIndex === -1) {
    // No named params. Set to infinity for the check for positionType below.
    namedParametersStartIndex = Infinity;
  } else {
    // Index will change after we pop name line below.
    namedParametersStartIndex--;
  }

  const nameLine = lines.shift() as string;

  if (lines.length > 0) {
    // Remove constructor ending. No field would be defined in this line.
    lines.pop();
  }

  const named = nameLine.includes(`${className}.`);
  const constructorName = named
    ? nameLine.substring(nameLine.indexOf(".") + 1, nameLine.indexOf("("))
    : null;

  const fieldsLines = lines
    .join("")
    .split(",")
    // TODO Modify the line below when adding support for one-line constructors
    .filter((line) => line !== "" && !line.includes("})"));

  const fields = fieldsLines
    .map((line) => {
      // Check some possible cases that would discard this line as one representing a field.
      if (
        line.includes("super.") ||
        line.includes(") {") ||
        line.includes("})")
      )
        return null;

      const positionType =
        fieldsLines.indexOf(line) > namedParametersStartIndex
          ? DartClassConstructorFieldPositionType.named
          : DartClassConstructorFieldPositionType.positional;
      const custom = !line.includes(classFieldReference);

      if (custom) {
        return getCustomConstructorField(line, positionType);
      } else {
        const fieldName = getClassFieldName(line, classFieldReference);
        const classField = allClassFields.find(
          (field) => field.name === fieldName
        );

        if (classField) {
          return classFieldToConstructorField(classField, positionType);
        }

        return null;
      }
    })
    .whereType<DartClassConstructorField>();

  return new DartClassConstructor(
    constructorName !== null,
    fields,
    constructorName
  );
}

function getCustomConstructorField(
  line: string,
  positionType: DartClassConstructorFieldPositionType
): DartClassConstructorField {
  const lineParts = line.trim().split(" ");
  let name: string;
  let type: string;
  if (lineParts[0] === "required") {
    name = lineParts[2];
    type = lineParts[1];
  } else {
    name = lineParts[1];
    type = lineParts[0];
  }

  if (type.endsWith("?")) {
    return new DartClassConstructorField(
      name,
      type.removeTrailing(1),
      positionType,
      true
    );
  }

  return new DartClassConstructorField(name, type, positionType, false);
}

function classFieldToConstructorField(
  classField: DartClassField,
  positionType: DartClassConstructorFieldPositionType
): DartClassConstructorField {
  return new DartClassConstructorField(
    classField.name,
    classField.type,
    positionType,
    classField.nullable
  );
}

function getClassFieldName(line: string, classFieldReference: string): string {
  const lineFromFieldName = line.substringAfter(classFieldReference);
  const hasDefaultValue = lineFromFieldName.includes(" = ");
  if (hasDefaultValue) {
    return lineFromFieldName.substring(0, lineFromFieldName.indexOf(" = "));
  }
  return lineFromFieldName;
}

function doesLookingFurtherMakeSense(line: string): boolean {
  return (
    !line.includes("Widget build(BuildContext context)") &&
    !line.includes("createState() =>")
  );
}

function removeComments(lines: Array<string>): Array<string> {
  return lines.filter((line) => !line.trim().startsWith("//"));
}

function doesLineContainClassDeclaration(
  line: string,
  lineBelow: string
): boolean {
  return (
    line.includes("class ") &&
    (line.includes("Widget") || lineBelow.includes("Widget"))
  );
}

export {
  doesLineContainClassDeclaration,
  doesLookingFurtherMakeSense,
  isConstructorLine,
  parseLinesToClassFields,
  parseLinesToClassName,
  parseLinesToConstructor,
  parseLinesToConstructors,
  parseTextToClass,
  parseTextToClasses,
};
