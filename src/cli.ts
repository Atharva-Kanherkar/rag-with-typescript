import { Command } from "commander";

const program = new Command();

program
  .name("documind")
  .description("Document intelligence CLI")
  .version("1.0.0");

program
  .command("ingest")
  .description("Ingest documents")
  .action(() => {
    console.log("Not implemented yet");
  });

program
  .command("index")
  .description("Index documents")
  .action(() => {
    console.log("Not implemented yet");
  });

program
  .command("query")
  .description("Query documents")
  .action(() => {
    console.log("Not implemented yet");
  });

program
  .command("eval")
  .description("Evaluate retrieval")
  .action(() => {
    console.log("Not implemented yet");
  });

program
  .command("serve")
  .description("Start API server")
  .action(() => {
    console.log("Not implemented yet");
  });

program.parse();
