import axios from 'axios';
import cheerio from 'cheerio';
import fs from 'fs';
import { from, of } from 'rxjs';
import {
  map,
  tap,
  mergeMap,
  catchError,
  finalize,
  delay,
  concatMap,
  take,
  switchMap,
} from 'rxjs/operators';
import { scrapDirectives } from './directive-scraper';
import environmentVariables from './jenkins-env-vars.json';
import { JenkinsData, Parameter, ParameterType, Step, Plugin } from './model';
import { scrapSections } from './section-scraper';
import { color, Color, toMarkdown } from './utils';

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
    sections: [],
    directives: [],
    environmentVariables,
  };
  const axiosInstance = axios.create();
  const mainScrapProcess = from(axiosInstance.get(jenkinsReferenceUrl)).pipe(
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
            jenkinsData.instructions.push(parseStep($, docElem, plugin));
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
  );
  scrapSections()
    .pipe(
      tap(sections => (jenkinsData.sections = sections)),
      take(1),
      switchMap(() => scrapDirectives()),
      tap(directives => (jenkinsData.directives = directives)),
      take(1),
      switchMap(() => mainScrapProcess),
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

function parseStep($: cheerio.Root, docElem: cheerio.Element, plugin: Plugin): Step {
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
      instructionType: 'Parameter',
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
    instructionType: 'Step',
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
