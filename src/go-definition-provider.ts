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
    const pattern = `**/${clickedWord}.groovy`;
    return vscode.workspace.findFiles(pattern).then(uris => {
      return new Promise((resolve, reject) => {
        resolve(new vscode.Location(uris[0], new vscode.Position(0, 0)));
      });
    });
  }
}
