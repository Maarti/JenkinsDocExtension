import axios, { AxiosInstance, AxiosResponse } from 'axios';
import cheerio from 'cheerio';
import fs from 'fs';

console.log('Scraper starting...');

main();

async function main() {
  // Config
  const jenkinsReferenceUrl = 'https://www.jenkins.io/doc/pipeline/steps/';
  const outputFile = 'src/jenkins-data.json';

  const jenkinsData: JenkinsData = {
    date: new Date().toISOString(),
    plugins: [],
    instructions: [],
  };
  const axiosInstance = axios.create();
  jenkinsData.plugins = await parsePluginsUrl(
    axiosInstance,
    jenkinsReferenceUrl,
  );
  console.log(`${jenkinsData.plugins.length} plugins found`);

  const pluginQueries = jenkinsData.plugins.map(plugin =>
    axiosInstance.get(plugin.url).then(response => ({
      ...plugin,
      response,
    })),
  );

  Promise.all(pluginQueries)
    .then(queries => {
      const instructions: Instruction[] = [];
      queries.forEach(query => {
        console.log(`Getting url: ${query.response.config.url}`);
        instructions.push(...parseInstructionsFromHTML(query));
      });
      instructions.sort((a, b) => (a.command < b.command ? -1 : 1));
      console.log('Total:');
      printScrapingResult(instructions);
      jenkinsData.instructions = instructions;
      const prettyOutput = JSON.stringify(jenkinsData, null, 2);
      fs.writeFileSync(outputFile, prettyOutput);
      console.log(`Extracted in: ${outputFile}`);
    })
    .catch(error =>
      console.error(`Error while parsing instructions: ${error}`),
    );
}

async function parsePluginsUrl(axiosInstance: AxiosInstance, refUrl: string) {
  return axiosInstance
    .get(refUrl)
    .then(response => {
      console.log(`Parsing ${response.config.url}`);
      const $ = cheerio.load(response.data);
      const pluginElems: cheerio.Cheerio = $(
        'div.container div.col-lg-9 div > ul > li',
      );
      const plugins: Plugin[] = [];
      pluginElems.each((i, pluginElem) => {
        const name = $(pluginElem).find('> a').text().replace(/\n/g, '');
        const url =
          `https://www.jenkins.io${$(pluginElem).find('> a').attr('href')}` ||
          '';
        const id =
          url.replace(/\/$/, '').split('/').pop()?.toLowerCase() || 'unknown';
        plugins.push({
          name,
          url,
          id,
        });
      });
      return plugins;
    })
    .catch(error => {
      console.error(`Error while loading plugins: ${error}`);
      return [] as Plugin[];
    });
}

function parseInstructionsFromHTML({
  response,
  id,
}: {
  response: AxiosResponse<any>;
  id: string;
}): Instruction[] {
  const $ = cheerio.load(response.data);
  const docs: cheerio.Cheerio = $('.sect2');
  const instructions: Instruction[] = [];

  docs.each((i, docElem) => {
    const command: string = $(docElem).find('> h3 > code').text();
    const title: string = $(docElem).find('> h3').text();
    let description: string = $(docElem).find('> div').html() || '';
    description += $(docElem)
      .contents()
      .filter(
        (i, node) =>
          node.type === 'text' ||
          (node.type === 'tag' && node.tagName === 'code'),
      )
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

    instructions.push({
      command,
      title,
      description,
      parameters,
      plugin: id,
    });
  });
  printScrapingResult(instructions);
  return instructions;
}

function parseTypeAndValues(
  parameterElem: cheerio.Element,
  $: cheerio.Root,
): { type: ParameterType; values: string[] } {
  let categoryExpected = $(parameterElem)
    .find('> ul > li > b, > ul > b')
    .text()
    .trim();
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

function printScrapingResult(instructions: Instruction[]) {
  console.log(`   => ${instructions.length} instructions found`);
  // console.log(`   => ${instructions.map(instruction => instruction.command).join(', ')}`);
}

interface Plugin {
  id: string;
  name: string;
  url: string;
}

interface Instruction {
  command: string;
  title: string;
  plugin: string;
  description: string;
  parameters: Parameter[];
}

interface Parameter {
  name: string;
  type: ParameterType;
  values: string[];
  description: string;
  isOptional: boolean;
}

interface Url {
  label: string;
  url: string;
  html: string;
}

interface JenkinsData {
  date: string;
  plugins: Plugin[];
  instructions: Instruction[];
}

type ParameterType =
  | 'String'
  | 'boolean'
  | 'Enum'
  | 'Nested'
  | 'unknown'
  | string;
