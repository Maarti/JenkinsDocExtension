import * as vscode from "vscode";
import { docs } from "./extension";


export class HoverProvider implements vscode.HoverProvider {
  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    const wordRange = document.getWordRangeAtPosition(position);
    const hoveredWord = document.getText(wordRange);
    console.log(`Hovered word: ${hoveredWord}`);
    if (docs.has(hoveredWord)) {
      return {
        contents: docs.get(hoveredWord) || [],
      };
    }
    return null;
  }
}
