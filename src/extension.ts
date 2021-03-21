import * as vscode from 'vscode';
import { CompletionProvider } from './completion-provider';
import { GoDefinitionProvider } from './go-definition-provider';
import { HoverProvider } from './hover-provider';
import jenkinsData from './jenkins-data.json';

/** Map containing all Jenkins documentation data indexed by their instruction name */
export const docs = new Map<string, vscode.MarkdownString[]>();
export const completions: vscode.CompletionItem[] = [];
export const envVarCompletions: vscode.CompletionItem[] = [];
export const sectionCompletions: vscode.CompletionItem[] = [];

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "jenkins-doc" is now active');
  initDocMap();
  initEnvVarCompletionArray();
  initSectionCompletionArray();
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

  context.subscriptions.push(hoverRegistration, completionRegistration, goToDefinitionRegistration);
}

export function deactivate() {
  console.log('jenkins-doc deactivated');
}

function initDocMap() {
  console.log('Hovering Documentation map initialization...');
  // Jenkins instructions
  jenkinsData.instructions.forEach(instruction => {
    const markdowns: vscode.MarkdownString[] = [];
    markdowns.push(
      new vscode.MarkdownString(`**${instruction.name}**\n\n${instruction.description}`),
    );
    instruction.parameters.forEach(parameter => {
      const markdown = new vscode.MarkdownString();
      const optionalLabel = parameter.isOptional ? '*(Optional)*' : '';
      markdown.appendMarkdown(`\`${parameter.name}\`: **${parameter.type}** ${optionalLabel}\n\n`);
      parameter.values.forEach(value => markdown.appendMarkdown(`* ${value}\n`));
      markdown.appendMarkdown(`\n`);
      markdown.appendMarkdown(`${parameter.description}`);
      markdowns.push(markdown);
    });
    if (instruction.url) {
      markdowns.push(new vscode.MarkdownString(`[See documentation](${instruction.url})`));
    }
    docs.set(instruction.command, markdowns);
  });

  // Jenkins env variables
  jenkinsData.environmentVariables.forEach(envVar => {
    const markdowns: vscode.MarkdownString[] = [];
    markdowns.push(
      new vscode.MarkdownString(`**${envVar.name}**\n\n${envVar.description}`),
      new vscode.MarkdownString(
        'Referencing or using environment variables can be accomplished like accessing any key in a Groovy Map, for example:',
      ).appendCodeblock(
        `step {\n    echo "${envVar.name} is: \${env.${envVar.name}}"\n}`,
        'groovy',
      ),
      new vscode.MarkdownString(
        'The full list of environment variables accessible from within Jenkins Pipeline is documented at ${YOUR_JENKINS_URL}/pipeline-syntax/globals#env',
      ),
    ),
      docs.set(envVar.name, markdowns);
  });
  console.log(`Hovering Documentation map initialized with ${docs.size} entries`);

  // Jenkins Sections/Directives
  [...jenkinsData.sections, ...jenkinsData.directives].forEach(section => {
    const markdowns: vscode.MarkdownString[] = [];
    const optionalLabel = section.isOptional ? '*(Optional)*' : '';
    markdowns.push(
      new vscode.MarkdownString(`**${section.name}** ${optionalLabel}\n\n${section.description}`),
    );
    markdowns.push(new vscode.MarkdownString(`**Allowed:** ${section.allowed}`));
    if (section.url) {
      markdowns.push(new vscode.MarkdownString(`[See documentation](${section.url})`));
    }
    docs.set(section.name, markdowns);
  });
}

function initEnvVarCompletionArray() {
  console.log('Env Var Completion array initialization...');
  envVarCompletions.push(
    ...jenkinsData.environmentVariables.map(envVar => {
      const completion = new vscode.CompletionItem(envVar.name);
      completion.insertText = new vscode.SnippetString(`env.${envVar.name}`);
      completion.detail = 'Jenkins Environment Variable';
      completion.documentation = new vscode.MarkdownString(envVar.description);
      completion.kind = vscode.CompletionItemKind.Variable;
      return completion;
    }),
  );
  const envCompletion = new vscode.CompletionItem('env', vscode.CompletionItemKind.Variable);
  envCompletion.command = {
    command: 'editor.action.triggerSuggest',
    title: 'Trigger environment variables autocompletion',
  };
  envCompletion.insertText = 'env.';
  envCompletion.detail = 'Jenkins Environment Variable';
  envCompletion.documentation = new vscode.MarkdownString(
    'The full list of environment variables accessible from within Jenkins Pipeline is documented at ${YOUR_JENKINS_URL}/pipeline-syntax/globals#env',
  );
  completions.push(envCompletion);
  console.log(`Env Var Completion array initialized with ${envVarCompletions.length} entries`);
}

function initSectionCompletionArray() {
  console.log('Section Completion array initialization...');
  sectionCompletions.push(
    ...jenkinsData.sections.map(section => {
      const completion = new vscode.CompletionItem(section.name);
      completion.detail = 'Jenkins Section';
      completion.documentation = new vscode.MarkdownString(section.description);
      completion.kind = vscode.CompletionItemKind.Method;
      if (section.innerInstructions.length) {
        const enumValues = section.innerInstructions.join(',');
        completion.insertText = new vscode.SnippetString(
          `${section.name}{\n    \${1|${enumValues}|}\n}`,
        );
      }
      return completion;
    }),
  );
  console.log(`Section Completion array initialized with ${sectionCompletions.length} entries`);
}

function initCompletionArray() {
  console.log('Completion array initialization...');
  completions.push(
    ...envVarCompletions,
    ...sectionCompletions,
    ...jenkinsData.instructions.map(instruction => {
      const completion = new vscode.CompletionItem(instruction.command);
      if (instruction.parameters.length) {
        completion.command = {
          command: 'editor.action.triggerSuggest',
          title: 'Trigger parameters autocompletion',
        };
        completion.insertText = new vscode.SnippetString(`${instruction.command}($0)`);
      } else {
        completion.insertText = new vscode.SnippetString(`${instruction.command}()`);
      }
      completion.detail = `Jenkins (${instruction.plugin}) Instruction`;
      completion.documentation = new vscode.MarkdownString(instruction.description);
      completion.kind = vscode.CompletionItemKind.Function;
      return completion;
    }),
  );
  console.log(`Completion array initialized with ${completions.length} entries`);
}
