function parseTextToClass(text: string): DartClass {
  const lines = text.split('\n').filter((line) => line != '');

  const classFields = parseLinesToClassFields(lines);
  const className = parseLinesToClassName(lines);
  const construtors = parseLinesToConstructors(lines, className, classFields);

  const clazz = new DartClass(className, classFields, construtors);

  return clazz;
}

function parseLinesToClassFields(lines: Array<string>): Array<DartClassField> {
  lines = lines.filter((line) => !line.startsWith('  ///'));
  // Two spaces in the beginning - it has to be a class property.
  const fieldListStartIndex = lines.findIndex((line) => line.startsWith('  final'));
  let fieldListEndIndex = fieldListStartIndex;
  for (let i = fieldListStartIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!doesLookingFurtherMakeSense(line)) {
      break;
    }
    if (line.endsWith(';') && (line.startsWith('  final') || (lines[i - 1].startsWith('  final') && !lines[i - 1].includes(';')))) {
      fieldListEndIndex = i;
    }
  }

  const fieldListLines = lines.slice(fieldListStartIndex, fieldListEndIndex + 1).join('').replace(/\s+/g, ' ').trim()
    .split(';').filter((line) => line != '' && !line.startsWith('///'));

  return fieldListLines.map(function (line) {
    const lineParts = line.trim().split(' ');
    const type = lineParts[1];
    const name = lineParts[2].replace(';', '');

    return new DartClassField(name, type);
  });
}

function parseLinesToClassName(lines: Array<string>): string {
  return lines.find((line) => line.startsWith('class '))!.split(' ')[1];
}

function parseLinesToConstructors(lines: Array<string>, className: string, classFields: Array<DartClassField>): Array<DartClassConstructor> {
  const constructors: Array<DartClassConstructor> = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!doesLookingFurtherMakeSense(line)) {
      break;
    }

    const isConstructorLine = line.includes(`${className}({`) || (line.includes(`${className}`) && line.includes('({'));
    if (!isConstructorLine) {
      i++;
      continue;
    }


    for (let j = i; j < lines.length; j++) {
      // TODO Consider counting open and closed parenthesis to check whether constructor got closed
      if (lines[j].includes('});') || lines[j].includes('}) :') || lines[j].includes('})  :')) {
        const constructorContent = lines.slice(i, j + 1);
        const constructor = parseLinesToConstructor(constructorContent, className, classFields);
        constructors.push(constructor);

        i = j + 1;
        break;
      }
    }
  }

  return constructors;
}

function parseLinesToConstructor(lines: Array<string>, className: string, classFields: Array<DartClassField>): DartClassConstructor {
  const thiss = 'this.';

  let constructorName: string | null = null;
  const named = lines[0].includes(`${className}.`);
  if (named) {
    constructorName = lines[0].substring(lines[0].indexOf('.') + 1, lines[0].indexOf('({'));
  }

  const fieldLines = lines.slice(1).join('').split(',').filter((line) => line != '' && !line.includes('})'));
  const fieldLinesForClassFields = fieldLines.filter((line) => line.includes(thiss));
  const fieldNames = fieldLinesForClassFields.map((line) => {
    const lineFromFieldName = line.substring(line.indexOf(thiss) + thiss.length);
    const hasDefaultValue = lineFromFieldName.indexOf(' ') != -1;
    if (hasDefaultValue) {
      return lineFromFieldName.substring(0, lineFromFieldName.indexOf(' '));
    }
    return lineFromFieldName;
  })

  const cutomFieldLines = fieldLines.filter((line) => !line.includes(thiss) && !line.includes('super.'));

  const customFields = cutomFieldLines.map((line) => {
    const lineParts = line.trim().split(' ');
    if (line.includes('required')) {
      return new DartClassField(lineParts[2], lineParts[1]);
    }
    return new DartClassField(lineParts[1], lineParts[0]);
  })

  const fields = fieldNames.map((fieldName) => classFields.find((field) => field.name == fieldName)!);

  return new DartClassConstructor(constructorName != null, [...fields, ...customFields], constructorName);
}

function doesLookingFurtherMakeSense(line: string): boolean {
  return !line.includes('Widget build(BuildContext context)') && !line.includes('createState() =>');
}

class DartClass {
  name: string;
  fields: Array<DartClassField>;
  constructors: Array<DartClassConstructor>;

  constructor(name: string, fields: Array<DartClassField>, constructors: Array<DartClassConstructor>) {
    this.name = name;
    this.fields = fields;
    this.constructors = constructors;
  }
}

class DartClassConstructor {
  named: boolean;
  fields: Array<DartClassField>;
  name: string | null;

  constructor(named: boolean, fields: Array<DartClassField>, name: string | null) {
    this.named = named;
    this.fields = fields;
    this.name = name;
  }
}

class DartClassField {
  name: string = "";
  type: string = "";

  constructor(name: string, type: string) {
    this.name = name;
    this.type = type;
  }
}

export {
  doesLookingFurtherMakeSense
};