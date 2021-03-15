# [Jenkins Doc VSCode extension](https://marketplace.visualstudio.com/items?itemName=Maarti.jenkins-doc)

![Logo](./assets/logo_128.png)

Provides documentation and autocompletion for Jenkins instructions as well as over 600 Jenkins plugins!

[![Status](https://img.shields.io/github/checks-status/maarti/JenkinsDocExtension/master?color=green&label=master)](https://github.com/Maarti/JenkinsDocExtension)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/maarti.jenkins-doc)](https://marketplace.visualstudio.com/items?itemName=Maarti.jenkins-doc)
[![Last commit](https://img.shields.io/github/last-commit/maarti/JenkinsDocExtension/develop)](https://github.com/Maarti/JenkinsDocExtension/commits/develop)
[![Version](https://img.shields.io/github/package-json/v/maarti/JenkinsDocExtension)](https://github.com/Maarti/JenkinsDocExtension/releases)
[![Rating](https://img.shields.io/visual-studio-marketplace/stars/maarti.jenkins-doc)](https://marketplace.visualstudio.com/items?itemName=Maarti.jenkins-doc)

## Features

- Display Jenkins documentation when hovering over recognized instructions:

![Documentation on hover](./assets/demo_doc_hover.gif)

- Autocompletion for instructions:

![Instructions autocompletion](./assets/demo_autocompletion.gif)

- Autocompletion for parameters:

![Parameters autocompletion](./assets/demo_parameter_autocompletion.gif)

- "Go To Definition" (or `Ctrl` + click) for functions that take you to the Groovy file with the same name:

!["Go To Definition" feature](./assets/demo_go_to_definition.gif)

## Release Notes

What's new?

### [1.2.0](https://github.com/Maarti/JenkinsDocExtension/releases/tag/1.2.0) - 2021-03-14

- Documentation for Jenkins environment variables
- Autocompletion for Jenkins environment variables

### [1.1.0](https://github.com/Maarti/JenkinsDocExtension/releases/tag/1.1.0) - 2021-03-10

- Autocompletion for more than 1400 instructions
- Autocompletion for instructions parameters
- Autocompletion for boolean and enum parameters
- Improved documentation for nested objects and enum type parameters

See the [Changelog](./CHANGELOG.md)

## Features considered for the future (brainstorming):

- ✅ Documentation for Jenkins instructions
- ✅ "Go To Definition" for file with the same name
- ✅ Autocompletion for Jenkins instructions
- ✅ Autocompletion for instructions parameters
- ✅ Documentation for Jenkins env vars
- ✅ Autocompletion for Jenkins env vars
- ✅ Support Jenkinsfile in the same way as Groovy files
- ⬛ "Go To Definition" for functions in the same file
- ⬛ "Go To Definition" for functions in a different file
- ⬛ Support [Jenkins parameters](https://www.jenkins.io/doc/book/pipeline/syntax/#parameters) (`booleanParam`, `string`, `extendedChoice`,...)
- ⬛ Support symbols (breadcrumbs and outline in VSCode)
- ❌ Call the [pipeline linter](https://www.jenkins.io/doc/book/pipeline/development/)

See the [Roadmap](https://github.com/Maarti/JenkinsDocExtension/projects/1)
