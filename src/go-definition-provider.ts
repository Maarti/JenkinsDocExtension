import * as vscode from 'vscode';

export class GoDefinitionProvider implements vscode.DefinitionProvider {
  public provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
  ): Thenable<vscode.Location> {
    const wordRange = document.getWordRangeAtPosition(position);
    const clickedWord = document.getText(wordRange);
    console.log(`Clicked word: ${clickedWord}`);

    // Check in the current file if a function is declared with this name
    for (let i = 0; i < document.lineCount; i++) {
      const functionDeclarationRegex = new RegExp(`\\w+(?: \\w+)? (${clickedWord}) *\\(.*\\) *{`);
      if (document.lineAt(i).text.match(functionDeclarationRegex)) {
        return new Promise((resolve, reject) => {
          resolve(new vscode.Location(document.uri, new vscode.Position(i, 0)));
        });
      }
    }

    // Check if a file has the same name of the clicked word
    const pattern = `**/${clickedWord}.groovy`;
    return vscode.workspace.findFiles(pattern).then(uris => {
      return new Promise((resolve, reject) => {
        resolve(new vscode.Location(uris[0], new vscode.Position(0, 0)));
      });
    });
  }
}
