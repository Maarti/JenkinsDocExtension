import axios from 'axios';
import cheerio from 'cheerio';
import { from, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { Directive } from './model';
import { color, Color, toMarkdown } from './utils';

console.log('Directive-scraper starting...');

// Config
const jenkinsDocUrl = `https://www.jenkins.io/doc/book/pipeline/syntax/`;

export function scrapDirectives() {
  const axiosInstance = axios.create();
  return from(axiosInstance.get(jenkinsDocUrl)).pipe(
    tap(response => console.log(`Fetching Directives list: ${response.config.url}`)),
    map(response => cheerio.load(response.data)),
    map($ => ({ $, directiveElems: $('#declarative-directives').parent().find('.sect3') })),
    map(({ $, directiveElems }) => {
      const directives: Directive[] = [];
      directiveElems.each((i, directiveElem) => directives.push(parseDirective($, directiveElem)));
      return directives.filter(d => d.name !== 'Jenkins cron syntax');
    }),
    map(directives => directives.sort((a, b) => (a.name < b.name ? -1 : 1))),
    tap(directives => {
      const msgColor = directives.length ? Color.green : Color.red;
      console.log(`  => ${color(`${directives.length} Directives found`, msgColor)}`);
    }),
    catchError(error => {
      console.error(color(`Error while fetching Directives:\n  ${error}`, Color.red));
      return of([] as Directive[]);
    }),
  );
}

function parseDirective($: cheerio.Root, directiveElem: cheerio.Element): Directive {
  const name = $(directiveElem).find('> h4').text().replace(/\n/g, '');
  const url = `${jenkinsDocUrl}${$(directiveElem).find('> h4 > a.anchor').attr('href')}` || '';
  let description: string = $(directiveElem).find('> div.paragraph').html() || '';
  description = description.replace(/\n/g, ' ');
  description = toMarkdown(description, jenkinsDocUrl);
  let allowed =
    $(directiveElem)
      .find('> table.syntax > tbody > tr > th > p:contains("Allowed")')
      .parent()
      .parent()
      .find('.paragraph')
      .html() || '';
  allowed = allowed.replace(/\n/g, '');
  allowed = toMarkdown(allowed).replace(/\.\s*$/, '');
  const isOptional =
    $(directiveElem)
      .find('> table.syntax > tbody > tr > th > p:contains("Required")')
      .parent()
      .parent()
      .find('.paragraph > p')
      .text() !== 'Yes';
  const innerInstructions: string[] = [];
  switch (name) {
    case 'parameters':
      innerInstructions.push('string', 'text', 'booleanParam', 'choice', 'password');
      break;
    case 'triggers':
      innerInstructions.push('cron', 'pollSCM', 'upstream');
      break;
    case 'tools':
      innerInstructions.push('maven', 'jdk', 'gradle');
      break;
    case 'input':
      innerInstructions.push(
        'message',
        'id',
        'ok',
        'submitter',
        'submitterParameter',
        'parameters',
      );
      break;
    case 'when':
      innerInstructions.push(
        'branch',
        'buildingTag',
        'changelog',
        'changeset',
        'changeRequest',
        'environment',
        'equals',
        'expression',
        'tag',
        'not',
        'allOf',
        'anyOf',
        'triggeredBy',
      );
      break;
    default:
      break;
  }

  return {
    name,
    description,
    instructionType: 'Directive',
    url,
    isOptional,
    innerInstructions,
    allowed,
  };
}
