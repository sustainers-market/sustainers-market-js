const normalize = require("@blossm/normalize-cli");

const eventStore = require("./event_store");
const viewStore = require("./view_store");
const commandHandler = require("./command_handler");
const eventHandler = require("./event_handler");
const authGateway = require("./auth_gateway");
const commandGateway = require("./command_gateway");
const viewGateway = require("./view_gateway");
const job = require("./job");

const domains = [
  "view-store",
  "event-store",
  "command-handler",
  "event-handler",
  "auth-gateway",
  "command-gateway",
  "view-gateway",
  "job"
];

module.exports = async args => {
  const input = await normalize({
    entrypointType: "domain",
    choices: domains,
    args
  });

  switch (input.domain) {
    case "view-store":
      return viewStore(input.args);
    case "event-store":
      return eventStore(input.args);
    case "command-handler":
      return commandHandler(input.args);
    case "event-handler":
      return eventHandler(input.args);
    case "auth-gateway":
      return authGateway(input.args);
    case "command-gateway":
      return commandGateway(input.args);
    case "view-gateway":
      return viewGateway(input.args);
    case "job":
      return job(input.args);
  }
};
