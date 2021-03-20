import { Url } from './model';

export function toMarkdown(html: string | null, baseUrl?: string): string {
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

  markdown = parseHtmlLinkToMarkdown(markdown, baseUrl);
  return markdown;
}

function parseHtmlLinkToMarkdown(text: string, baseUrl?: string): string {
  const regex = /<a href="(.*?)".*?>(.*?)<\/a>/gi;
  const urls: Url[] = [];
  let urlMatch;
  while ((urlMatch = regex.exec(text))) {
    urls.push({
      html: urlMatch[0],
      url: baseUrl && urlMatch[1].startsWith('#') ? `${baseUrl}${urlMatch[1]}` : urlMatch[1],
      label: urlMatch[2],
    });
  }
  urls.forEach(url => {
    text = text.replace(url.html, `[${url.label}](${url.url})`);
  });
  return text;
}

export type Falsy = false | 0 | '' | null | undefined;

export function truthy<T>(input: T | Falsy): input is T {
  return !!input;
}

export enum Color {
  red = '\x1b[31m',
  green = '\x1b[32m',
  yellow = '\x1b[33m',
  blue = '\x1b[34m',
  magenta = '\x1b[35m',
  cyan = '\x1b[36m',
}

export function color(message: string, color = Color.green): string {
  return `${color}${message}\x1b[0m`;
}
