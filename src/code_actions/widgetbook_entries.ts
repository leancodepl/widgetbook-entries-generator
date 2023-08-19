import * as vscode from "vscode";
import { CodeAction, CodeActionKind } from "vscode";
import "../util/extensions";

class WidgetbookEntriesCodeActions {
  provideCodeActions(): Array<CodeAction> {
    if (!this.isCursorAtWidgetClassDeclaration()) return [];

    const commands = [
      {
        command: "widgetbook-generator.generate.widget",
        title: "Create widgetbook entry for this widget",
      },
    ];

    return commands.map((c) => {
      // FIXME Reconsider CodeActionKind
      const action = new CodeAction(c.title, CodeActionKind.QuickFix);
      action.command = {
        command: c.command,
        title: c.title,
      };
      return action;
    });
  }

  isCursorAtWidgetClassDeclaration(): boolean {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) return false;

    const lineIndex = activeEditor.selection.active.line;
    const currentLine = activeEditor.document.lineAt(lineIndex).text;

    return currentLine.includesAll(["class", "Widget"]);
  }
}

export { WidgetbookEntriesCodeActions };
