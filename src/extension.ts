import * as vscode from 'vscode';
import { CompletionProvider } from './completion-provider';
import { GoDefinitionProvider } from './go-definition-provider';
import { HoverProvider } from './hover-provider';
import jenkinsData from './jenkins-data.json';

/** Map containing all Jenkins documentation data indexed by their instruction name */
export const docs = new Map<string, vscode.MarkdownString[]>();
export const completions: vscode.CompletionItem[] = [];

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "jenkins-doc" is now active');
  initDocMap();
  initCompletionArray();

  const groovyFileSelector: vscode.DocumentSelector = {
    language: 'groovy', // Known language identifiers list: https://code.visualstudio.com/docs/languages/identifiers
  };
  const hoverRegistration = vscode.languages.registerHoverProvider(
    groovyFileSelector,
    new HoverProvider(),
  );
  const completionRegistration = vscode.languages.registerCompletionItemProvider(
    groovyFileSelector,
    new CompletionProvider(),
  );
  const goToDefinitionRegistration = vscode.languages.registerDefinitionProvider(
    groovyFileSelector,
    new GoDefinitionProvider(),
  );

  context.subscriptions.push(
    hoverRegistration,
    completionRegistration,
    goToDefinitionRegistration,
  );
}

export function deactivate() {
  console.log('jenkins-doc deactivated');
}

function initDocMap() {
  console.log('Docs map initialization...');
  jenkinsData.instructions.forEach(instruction => {
    const markdowns: vscode.MarkdownString[] = [];
    markdowns.push(
      new vscode.MarkdownString(
        `**${instruction.title}**\n\n${instruction.description}`,
      ),
    );
    instruction.parameters.forEach(parameter => {
      const markdown = new vscode.MarkdownString();
      const optionalLabel = parameter.isOptional ? '*(Optional)*' : '';
      markdown.appendMarkdown(
        `\`${parameter.name}\`: **${parameter.type}** ${optionalLabel}\n\n`,
      );
      markdown.appendMarkdown(`${parameter.description}`);
      markdowns.push(markdown);
    });
    docs.set(instruction.command, markdowns);
  });
  console.log(`Docs map initialized with ${docs.size} entries`);
}

function initCompletionArray() {
  console.log('Completion array initialization...');
  completions.push(
    ...Array.from(docs.keys()).map(
      instruction => new vscode.CompletionItem(instruction),
    ),
  );
  console.log(
    `Completion array initialized with ${completions.length} entries`,
  );
}
