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

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "jenkins-doc.helloWorld",
    () => {
      // The code you place here will be executed every time your command is executed

      // Display a message box to the user
      vscode.window.showInformationMessage(
        "Hello Team from jenkins-doc plugin! 🦙🦙🦙"
      );
    }
  );

  vscode.languages.registerHoverProvider("groovy", new HoverProvider());

  let groovyFileSelector: vscode.DocumentSelector = {
    // pattern: "**/*.groovy",
    scheme: "file",
    language: "groovy",
  };

  const goToDefinitionRegistration = vscode.languages.registerDefinitionProvider(
    groovyFileSelector,
    new GoDefinitionProvider()
  );
  console.log(`registered ${goToDefinitionRegistration}`);
  context.subscriptions.push(disposable, goToDefinitionRegistration);
}

// this method is called when your extension is deactivated
export function deactivate() {
  console.log("jenkins-doc deactivated");
}
