import * as vscode from "vscode";
import { GoDefinitionProvider } from "./go-definition-provider";
import { HoverProvider } from "./hover-provider";
import jenkinsData from "./jenkins-data.json";

/** Map containing all Jenkins documentation data indexed by their instruction name */
export const docs = new Map<string, vscode.MarkdownString[]>();

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "jenkins-doc" is now active');
  initDocMap();

  const groovyFileSelector: vscode.DocumentSelector = {
    // pattern: "**/*.groovy",
    scheme: "file",
    language: "groovy",
  };
  const hoverRegistration = vscode.languages.registerHoverProvider(groovyFileSelector, new HoverProvider());
  const goToDefinitionRegistration = vscode.languages.registerDefinitionProvider(
    groovyFileSelector,
    new GoDefinitionProvider()
  );

  context.subscriptions.push(hoverRegistration, goToDefinitionRegistration);
}

export function deactivate() {
  console.log("jenkins-doc deactivated");
}

function initDocMap() {
  console.log('Docs map initialization...');
  jenkinsData.instructions.forEach((instruction) => {
    const markdowns: vscode.MarkdownString[] = [];
    markdowns.push(new vscode.MarkdownString(`**${instruction.title}**\n\n${instruction.description}`));
    instruction.parameters.forEach(parameter => {
      const markdown = new vscode.MarkdownString();
      const optionalLabel = parameter.isOptional ? "*(Optional)*" : "";
      markdown.appendMarkdown(
        `\`${parameter.name}\`: **${parameter.type}** ${optionalLabel}\n\n`
      );
      markdown.appendMarkdown(`${parameter.description}`);
      markdowns.push(markdown);
    });
    docs.set(instruction.command, markdowns);
  });
  console.log(`Docs map initialized with ${docs.size} entries`);
}