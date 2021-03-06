import * as vscode from "vscode";
import jenkinsDoc from "./jenkins-doc.json";

export class HoverProvider implements vscode.HoverProvider {
  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    const wordRange = document.getWordRangeAtPosition(position);
    const hoveredWord = document.getText(wordRange);
    console.log(`Hovered word: ${hoveredWord}`);

    const doc = new Map<string, vscode.MarkdownString[]>();
    jenkinsDoc.forEach((instruction) => {
      const markdowns: vscode.MarkdownString[] = [];
      markdowns.push(new vscode.MarkdownString(`### ${instruction.title}`));
      instruction.args.forEach((arg) => {
        const markdown = new vscode.MarkdownString();
        const optionalLabel = arg.isOptional ? "*(Optional)*" : "";
        markdown.appendMarkdown(
          `\`${arg.name}\`: **${arg.type}** ${optionalLabel}\n\n`
        );
        markdown.appendMarkdown(`${arg.description}`);
        markdowns.push(markdown);
      });
      doc.set(instruction.command, markdowns);
    });

    if (doc.has(hoveredWord)) {
      return {
        contents: doc.get(hoveredWord) || [],
      };
    }
    return null;
  }
}
