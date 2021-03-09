import * as vscode from 'vscode';
import { completions } from './extension';

export class CompletionProvider<
  T extends vscode.CompletionItem = vscode.CompletionItem
> implements vscode.CompletionItemProvider {
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext,
  ) {
    return completions;
  }
}
