import axios from "axios";
import cheerio from "cheerio";
import fs from "fs";

console.log("Scraper starting...");

const url =
  "https://www.jenkins.io/doc/pipeline/steps/workflow-durable-task-step/";
const axiosInstance = axios.create();


axiosInstance.get(url)
  .then(

    (response) => {
      const html = response.data;
      const $ = cheerio.load(html);
      const docs: cheerio.Cheerio = $(".sect2");
      const instructions: any[] = [];

      docs.each((i, docElem) => {

        const command: string = $(docElem).find("h3 code").text();
        const title: string = $(docElem).find("h3").text();
        const args: any[] = [];
        const argElems = $(docElem).find("> ul > li");

        argElems.each((i, argElem) => {
          args.push({
            name: $(argElem).find("> code").text(),
            type: $(argElem).find("> ul > li > code").text(),
            description: toMarkdown($(argElem).find("> div").html()),
            isOptional: $(argElem)
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
          args,
        });
      });

      const prettyOutput = JSON.stringify(instructions, null, 2);
      console.log(prettyOutput);
      fs.writeFileSync("src/jenkins-doc.json", prettyOutput);
    }
  )
  .catch(console.error);

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
