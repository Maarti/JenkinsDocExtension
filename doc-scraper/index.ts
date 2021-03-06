import axios from "axios";
import cheerio from "cheerio";
import fs from "fs";

console.log("Scraper starting...");

const jenkinsUrls = [
  "https://www.jenkins.io/doc/pipeline/steps/workflow-durable-task-step/",
  "https://www.jenkins.io/doc/pipeline/steps/workflow-basic-steps/"
];
const outputFile = "src/jenkins-doc.json";
const axiosInstance = axios.create();
const axiosResponses = jenkinsUrls.map(url => axiosInstance.get(url));

Promise.all(axiosResponses).then(responses => {

  const instructions: Instruction[] = [];
  responses.forEach(response => {
    console.log(`Getting url: ${response.config.url}`);
    instructions.push(...getInstructionsFromHTML(response.data));
  });
  instructions.sort(((a, b) => a.command < b.command ? -1 : 1));
  console.log('Total:');
  printScrapingResult(instructions);
  const prettyOutput = JSON.stringify(instructions, null, 2);;
  fs.writeFileSync(outputFile, prettyOutput);
  console.log(`Extracted in: ${outputFile}`);
});

function getInstructionsFromHTML(html: any) {
  const $ = cheerio.load(html);
  const docs: cheerio.Cheerio = $(".sect2");
  const instructions: Instruction[] = [];

  docs.each((i, docElem) => {
    const command: string = $(docElem).find("> h3 > code").text();
    const title: string = $(docElem).find("> h3").text();
    let description: string = $(docElem).find("> div").html() || '';
    description += $(docElem).contents()
      .filter((i, node) => node.type === "text" || (node.type === "tag" && node.tagName === "code"))
      .text();
    description = toMarkdown(description);
    const parameters: Parameter[] = [];
    const parameterElems = $(docElem).find("> ul > li");

    parameterElems.each((i, parameterElem) => {
      parameters.push({
        name: $(parameterElem).find("> code").text(),
        type: $(parameterElem).find("> ul > li > code").text(),
        description: toMarkdown($(parameterElem).find("> div").html()),
        isOptional: $(parameterElem)
          .contents()
          .filter((i, node) => node.type === "text")
          .text()
          .toLowerCase()
          .includes("optional"),
      });
    });

    instructions.push({
      command,
      title,
      description,
      parameters,
    });
  });
  printScrapingResult(instructions);
  return instructions;
}

function toMarkdown(html: string | null): string {
  if (!html) {
    return "";
  }
  return html
    .replace(/`/g, "")                    // remove all ` that would be present originally
    .replace(/<pre><code>/gi, "\n```groovy\n")
    .replace(/<\/code><\/pre>/gi, "\n```\n")
    .replace(/<\/?code>/gi, "`")          // replace <code></code> tags by `
    .replace(/<pre>/gi, "\n```groovy\n")  // replace <pre> tag by ```groovy
    .replace(/<\/pre>/gi, "\n```\n")      // replace </pre> tag by ```
    .replace(/<\/?(strong|b)>/gi, "**")   // replace <strong></strong><b></b> tags by **    
    .replace(/<h3>/gi, "\n### ")          // replace <h3> tag by \n### 
    .replace(/<\/h3>/gi, "\n")            // replace <h3> tag by \n
    .replace(/<\/?[u,o]l>/gi, "")         // remove <ul></ul><ol></ol>
    .replace(/<li>/gi, "\n* ")            // replace <li> tag by \n*
    .replace(/<\/li>/gi, "\n")            // replace </li> tag by \n
    .replace(/<\/?p>/gi, "\n")            // replace <p></p> tags by \n
    .replace(/<\/?div>/gi, "\n")          // replace <div></div> tags by \n
    .replace(/<br\/?>/gi, "\n\n")         // replace <br> tag by \n\n
    .replace(/ {4,}(?![\s\S]*`{3})/g, " ")// replace all "4 spaces in a row or more" by only one, if they are not followed by ``` in the rest of the string
    .replace(/^(\s)*/g, "")               // remove all \n and spaces at the start
    .replace(/(\s)*$/g, "");              // remove all \n and spaces at the end
}

function printScrapingResult(instructions: Instruction[]) {
  console.log(`   ${instructions.length} instruction documentations found:`);
  console.log(`   ${instructions.map(instruction => instruction.command).join(', ')}`);
}

interface Instruction {
  command: string;
  title: string;
  description: string;
  parameters: Parameter[];
}

interface Parameter {
  name: string;
  type: string;
  description: string;
  isOptional: boolean;
}