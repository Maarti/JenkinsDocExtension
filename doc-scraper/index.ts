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
    const command: string = $(docElem).find("h3 code").text();
    const title: string = $(docElem).find("h3").text();
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
    .replace(/`/g, "")            // remove all ` that would be present originally
    .replace(/<\/?code>/gi, "`")  // replace <code></code> tags by `
    .replace(/<\/?p>/gi, "\n")    // replace <p></p> tags by \n
    .replace(/<\/?div>/gi, "\n")  // replace  <div></div> tags by \n
    .replace(/^(\s)*/g, "")       // removes all \n and spaces at the start
    .replace(/(\s)*$/g, "");      // removes all \n and spaces at the end
}

function printScrapingResult(instructions: Instruction[]) {
  console.log(`   ${instructions.length} instruction documentations found:`);
  console.log(`   ${instructions.map(instruction => instruction.command).join(', ')}`);
}

interface Instruction {
  command: string;
  title: string;
  parameters: Parameter[];
}

interface Parameter {
  name: string;
  type: string;
  description: string;
  isOptional: boolean;
}