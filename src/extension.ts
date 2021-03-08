// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { GoDefinitionProvider } from "./go-definition-provider";
import { HoverProvider } from "./hover-provider";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Extension "jenkins-doc" is now active');

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

// this method is called when your extension is deactivated
export function deactivate() {
  console.log("jenkins-doc deactivated");
}
