import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  console.log("Flutter Docs Generator extension is now active.");

  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      "extension.generateDocumentation",
      generateDocumentation
    )
  );

  // Register the `dart` language for snippet activation
  vscode.languages.registerCompletionItemProvider("dart", {
    provideCompletionItems(
      document: vscode.TextDocument,
      position: vscode.Position
    ) {
      const linePrefix = document
        .lineAt(position)
        .text.substr(0, position.character);
      if (linePrefix.endsWith("///")) {
        return new vscode.CompletionList([
          new vscode.CompletionItem(
            "Generate method documentation",
            vscode.CompletionItemKind.Snippet
          ),
        ]);
      }
    },
  });
}

function generateDocumentation(
  textEditor: vscode.TextEditor,
  edit: vscode.TextEditorEdit
) {
  const document = textEditor.document;
  const currentPosition = textEditor.selection.active;
  let methodLineText = "";

  // Find the method declaration line above the current line
  let methodLine: vscode.TextLine | undefined;
  for (let line = currentPosition.line + 1; line >= 0; line++) {
    const lineText = document.lineAt(line).text;

    methodLineText += lineText;

    if (
      lineText.trim().endsWith(") {") ||
      lineText.trim().endsWith(") async {")
    ) {
      const lineTxt = document.lineAt(line);

      methodLine = {
        lineNumber: currentPosition.line + 1,
        text: methodLineText,
        range: lineTxt.range,
        rangeIncludingLineBreak: lineTxt.rangeIncludingLineBreak,
        firstNonWhitespaceCharacterIndex:
          lineTxt.firstNonWhitespaceCharacterIndex,
        isEmptyOrWhitespace: lineTxt.isEmptyOrWhitespace,
      };

      break;
    }
  }

  if (methodLine) {
    const methodName = extractMethodName(methodLine.text);
    const methodReturnType = extractMethodReturn(methodLine.text, methodName);
    const parameters = extractMethodParameters(methodLine.text);

    const commentLines = [];
    commentLines.push(`/// Documentation for ${methodName}`);

    parameters.forEach((param) => {
      commentLines.push(
        ` > * _\`@param: [${param.type}]\`_ - ${param.name}\n///`
      );
    });

    commentLines.push(` > _\`@returns: [${methodReturnType}]\`_`);

    const commentBlock = commentLines.join("\n///");
    const insertionPosition = new vscode.Position(methodLine.lineNumber, 0);

    edit.insert(insertionPosition, `${commentBlock}\n\n`);

    vscode.window.showInformationMessage(
      `Comment documentation for ${methodName} generated successfully`
    );
  }
}

function extractMethodName(line: string): string {
  const regex = /\w+\s*\(/;
  const match = line.match(regex);
  if (match) {
    return match[0].trim().replace(/[(){}]/g, "");
  }
  return "";
}

function extractMethodReturn(line: string, methodName: string): string {
  const values = line.split(methodName);

  if (values.length > 0) {
    return values[0].trim();
  }
  return "";
}

function extractMethodParameters(
  line: string
): { name: string; type: string; isRequired: boolean }[] {
  const regex = /\(([^)]+)\)/;
  const match = line.match(regex);
  if (match) {
    const parameterList = match[1]
      .replace(/[{}]/g, "")
      .trim()
      .split(",")
      .map((param) => param.trim())
      .filter((str) => str !== "");

    return parameterList.map((param) => {
      const params = param.split(" ");

      if (params.includes("required")) {
        const [_, type, name] = params;
        return { name, type, isRequired: true };
      } else {
        const [type, name] = params;
        return { name, type, isRequired: false };
      }
    });
  }
  return [];
}
