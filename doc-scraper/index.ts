import axios from 'axios';
import cheerio from 'cheerio';
import fs from 'fs';
import { from, of } from 'rxjs';
import { map, tap, mergeMap, catchError, finalize, delay, concatMap } from 'rxjs/operators';
import environmentVariables from './jenkins-env-vars.json';

console.log('Scraper starting...');

// Config
const jenkinsBaseUrl = 'https://www.jenkins.io';
const jenkinsReferenceUrl = `${jenkinsBaseUrl}/doc/pipeline/steps/`;
const outputFile = 'src/jenkins-data.json';
const requestsInterval = 0; // Delay between each http request (in ms), to avoid DDOSing jenkins.io

main();

function main() {
  const jenkinsData: JenkinsData = {
    date: new Date().toISOString(),
    plugins: [],
    instructions: [],
    environmentVariables,
  };
  const axiosInstance = axios.create();
  from(axiosInstance.get(jenkinsReferenceUrl))
    .pipe(
      tap(response => console.log(`Fetching plugins list: ${response.config.url}`)),
      map(response => cheerio.load(response.data)),
      map($ => ({ $, pluginElems: $('div.container div.col-lg-9 div > ul > li') })),
      tap(({ $, pluginElems }) =>
        pluginElems.each((i, pluginElem) => jenkinsData.plugins.push(parsePlugin($, pluginElem))),
      ),
      tap(() => console.log(`${jenkinsData.plugins.length} plugins found`)),
      // tap(() => (jenkinsData.plugins = pluginStubs)),
      mergeMap(() => jenkinsData.plugins),
      concatMap(plugin => of(plugin).pipe(delay(requestsInterval))),
      mergeMap(plugin =>
        from(axiosInstance.get(plugin.url)).pipe(
          tap(response => console.log(`Fetching ${response.config.url}`)),
          map(response => cheerio.load(response.data)),
          map($ => ({ docs: $('.sect2'), $ })),
          tap(({ docs, $ }) => {
            let counter = 0;
            docs.each((i, docElem) => {
              jenkinsData.instructions.push(parseInstruction($, docElem, plugin));
              counter++;
            });
            const msgColor = counter ? Color.green : Color.red;
            console.log(`  => ${color(`${counter} instructions found`, msgColor)}`);
          }),
          catchError(error => {
            console.log(
              color(
                `Error while fetching plugin ${plugin.name}:\n  ${error}\n  This plugin will be ignored`,
                Color.red,
              ),
            );

            return of(null);
          }),
        ),
      ),
      finalize(() => {
        jenkinsData.instructions.sort((a, b) => (a.command < b.command ? -1 : 1));
        console.log(`Total: ${jenkinsData.instructions.length} instructions found`);
        const prettyOutput = JSON.stringify(jenkinsData, null, 2);
        fs.writeFileSync(outputFile, prettyOutput);
        console.log(`Extracted in: ${outputFile}`);
      }),
      catchError(error => {
        console.error(color(`Error while fetching information:\n  ${error}`, Color.red));
        return of(null);
      }),
    )
    .subscribe();
}

function parsePlugin($: cheerio.Root, pluginElem: cheerio.Element): Plugin {
  const name = $(pluginElem).find('> a').text().replace(/\n/g, '');
  const url = `${jenkinsBaseUrl}${$(pluginElem).find('> a').attr('href')}` || '';
  const id = url.replace(/\/$/, '').split('/').pop()?.toLowerCase() || 'unknown';
  return {
    name,
    url,
    id,
  };
}

function parseInstruction($: cheerio.Root, docElem: cheerio.Element, plugin: Plugin): Step {
  const command: string = $(docElem).find('> h3 > code').text();
  const name: string = $(docElem).find('> h3').text();
  let description: string = $(docElem).find('> div').html() || '';
  description += $(docElem)
    .contents()
    .filter((i, node) => node.type === 'text' || (node.type === 'tag' && node.tagName === 'code'))
    .text();
  description = toMarkdown(description);
  const parameters: Parameter[] = [];
  const parameterElems = $(docElem).find('> ul > li');

  parameterElems.each((i, parameterElem) => {
    const { type, values } = parseTypeAndValues(parameterElem, $);
    parameters.push({
      name: $(parameterElem).find('> code').text(),
      type,
      values,
      description: toMarkdown($(parameterElem).find('> div').html()),
      isOptional: $(parameterElem)
        .contents()
        .filter((i, node) => node.type === 'text')
        .text()
        .toLowerCase()
        .includes('optional'),
    });
  });
  return {
    command,
    name,
    description,
    parameters,
    plugin: plugin.id,
  };
}

function parseTypeAndValues(
  parameterElem: cheerio.Element,
  $: cheerio.Root,
): { type: ParameterType; values: string[] } {
  let categoryExpected = $(parameterElem).find('> ul > li > b, > ul > b').text().trim();
  let type: ParameterType = 'unknown';
  let values: string[] = [];
  switch (categoryExpected.toLowerCase().trim()) {
    case 'type:':
      type = $(parameterElem).find('> ul > li > code').text();
      break;

    case 'values:':
      type = 'Enum';
      values = $(parameterElem)
        .find('> ul > li > code')
        .map((i, v) => $(v).text())
        .get();
      break;

    case 'nested object':
    case 'nested choice of objects':
    case 'array / list of nested object':
    case 'array / list of nested choice of objects':
      type = categoryExpected.trim();
      values = $(parameterElem)
        .find('> ul > li > code')
        .map((i, v) => $(v).text())
        .get();
      break;

    default:
      type = 'unknown';
      console.log('type not found for ', categoryExpected);
  }
  return { type, values };
}

function toMarkdown(html: string | null): string {
  if (!html) {
    return '';
  }
  let markdown = html
    .replace(/`/g, '') // remove all ` that would be present originally
    .replace(/<pre><code>/gi, '\n```groovy\n')
    .replace(/<\/code><\/pre>/gi, '\n```\n')
    .replace(/&amp;/gi, '&') // replace all &amp; by &
    .replace(/<\/?code>/gi, '`') // replace <code></code> tags by `
    .replace(/<pre>/gi, '\n```groovy\n') // replace <pre> tag by ```groovy
    .replace(/<\/pre>/gi, '\n```\n') // replace </pre> tag by ```
    .replace(/<\/?(strong|b)>/gi, '**') // replace <strong></strong><b></b> tags by **
    .replace(/<h3>/gi, '\n### ') // replace <h3> tag by \n###
    .replace(/<\/h3>/gi, '\n') // replace <h3> tag by \n
    .replace(/<\/?[u,o,d]l>/gi, '') // remove <ul></ul><ol></ol><dl></dl>
    .replace(/<li>/gi, '\n* ') // replace <li> tag by \n*
    .replace(/<dt>[\s]*/gi, '\n* **') // replace <dt> and all following line feeds by \n* **
    .replace(/[\s]*<\/dt>/gi, '**\n') // replace </dt> and all preceding line feeds by **\n
    .replace(/<\/?dd>/gi, '') // remove <dd></dd>
    .replace(/<\/li>/gi, '\n') // replace </li> tag by \n
    .replace(/<\/?p>/gi, '\n') // replace <p></p> tags by \n
    .replace(/<\/?div>/gi, '\n') // replace <div></div> tags by \n
    .replace(/<br\/?>/gi, '\n\n') // replace <br> tag by \n\n
    .replace(/ {4,}(?![\s\S]*`{3})/g, ' ') // replace all "4 spaces in a row or more" by only one, if they are not followed by ``` in the rest of the string
    .replace(/^(\s)*/g, '') // remove all \n and spaces at the start
    .replace(/(\s)*$/g, ''); // remove all \n and spaces at the end

  markdown = parseHtmlLinkToMarkdown(markdown);
  return markdown;
}

function parseHtmlLinkToMarkdown(text: string): string {
  const regex = /<a href="(.*?)".*?>(.*?)<\/a>/gi;
  const urls: Url[] = [];
  let urlMatch;
  while ((urlMatch = regex.exec(text))) {
    urls.push({
      html: urlMatch[0],
      url: urlMatch[1],
      label: urlMatch[2],
    });
  }
  urls.forEach(url => {
    text = text.replace(url.html, `[${url.label}](${url.url})`);
  });
  return text;
}

interface Plugin {
  id: string;
  name: string;
  url: string;
}

interface Instruction {
  name: string;
  description: string;
}
interface Step extends Instruction {
  command: string;
  plugin: string;
  parameters: Parameter[];
}

interface Parameter extends Instruction {
  type: ParameterType;
  values: string[];
  isOptional: boolean;
}

interface Url {
  label: string;
  url: string;
  html: string;
}

interface Variable {
  name: string;
  description: string;
}

interface JenkinsData {
  date: string;
  plugins: Plugin[];
  instructions: Step[];
  environmentVariables: Variable[];
}

type ParameterType = 'String' | 'boolean' | 'Enum' | 'Nested' | 'unknown' | string;

type Falsy = false | 0 | '' | null | undefined;

function truthy<T>(input: T | Falsy): input is T {
  return !!input;
}

enum Color {
  red = '\x1b[31m',
  green = '\x1b[32m',
  yellow = '\x1b[33m',
  blue = '\x1b[34m',
  magenta = '\x1b[35m',
  cyan = '\x1b[36m',
}

function color(message: string, color = Color.green): string {
  return `${color}${message}\x1b[0m`;
}

const pluginStubs = [
  { id: 'google', name: 'google', url: 'https://google.com' },
  { id: 'google2', name: 'google2', url: 'https://google.com' },
  { id: 'google3', name: 'google3', url: 'https://google.com' },
  { id: 'github', name: 'github', url: 'https://github.com/Maarti/SecretProject' },
  {
    id: 'jenkins',
    name: 'Jenkins',
    url: 'https://www.jenkins.io/doc/pipeline/steps/workflow-basic-steps/',
  },
  { id: 'google5', name: 'google5', url: 'https://google.com' },
];
