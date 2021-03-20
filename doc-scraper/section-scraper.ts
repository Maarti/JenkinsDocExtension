import axios from 'axios';
import cheerio from 'cheerio';
import { from, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { Section } from './model';
import { color, Color, toMarkdown } from './utils';

console.log('Section-scraper starting...');

// Config
const jenkinsDocUrl = `https://www.jenkins.io/doc/book/pipeline/syntax/`;

export function scrapSections() {
  const axiosInstance = axios.create();
  return from(axiosInstance.get(jenkinsDocUrl)).pipe(
    tap(response => console.log(`Fetching Sections list: ${response.config.url}`)),
    map(response => cheerio.load(response.data)),
    map($ => ({ $, sectionsElems: $('#declarative-sections').parent().find('.sect3') })),
    map(({ $, sectionsElems }) => {
      const sections: Section[] = [];
      sectionsElems.each((i, sectionsElem) => sections.push(parseSection($, sectionsElem)));
      return sections;
    }),
    map(sections => sections.sort((a, b) => (a.name < b.name ? -1 : 1))),
    tap(sections => {
      const msgColor = sections.length ? Color.green : Color.red;
      console.log(`  => ${color(`${sections.length} Sections found`, msgColor)}`);
    }),
    catchError(error => {
      console.error(color(`Error while fetching Sections:\n  ${error}`, Color.red));
      return of([] as Section[]);
    }),
  );
}

function parseSection($: cheerio.Root, sectionElem: cheerio.Element): Section {
  const name = $(sectionElem).find('> h4').text().replace(/\n/g, '');
  const url = `${jenkinsDocUrl}${$(sectionElem).find('> h4 > a.anchor').attr('href')}` || '';
  let description: string = $(sectionElem).find('> div.paragraph').html() || '';
  description = description.replace(/\n/g, ' ');
  description = toMarkdown(description, jenkinsDocUrl);
  let allowed =
    $(sectionElem)
      .find('> table.syntax > tbody > tr > th > p:contains("Allowed")')
      .parent()
      .parent()
      .find('.paragraph')
      .html() || '';
  allowed = allowed.replace(/\n/g, '');
  allowed = toMarkdown(allowed).replace(/\.\s*$/, '');
  const isOptional =
    $(sectionElem)
      .find('> table.syntax > tbody > tr > th > p:contains("Required")')
      .parent()
      .parent()
      .find('.paragraph > p')
      .text() !== 'Yes';
  const innerInstructions: string[] = [];
  switch (name) {
    case 'agent':
      innerInstructions.push('label', 'node', 'docker', 'dockerfile', 'kubernetes');
      break;
    case 'post':
      innerInstructions.push(
        'always',
        'changed',
        'fixed',
        'regression',
        'aborted',
        'failure',
        'success',
        'unstable',
        'unsuccessful',
        'cleanup',
      );
      break;
    case 'stages':
      innerInstructions.push('stage');
      break;
    case 'steps':
      innerInstructions.push('step');
      break;
    default:
      break;
  }

  return {
    name,
    description,
    instructionType: 'Section',
    url,
    isOptional,
    innerInstructions,
    allowed,
  };
}
