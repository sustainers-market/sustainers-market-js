const normalize = require("@sustainers/normalize-cli");
const roboSay = require("@sustainers/robo-say");
const mergeCliTemplate = require("@sustainers/merge-cli-template");
const deployCliTemplate = require("@sustainers/deploy-cli-template");
const testCliTemplate = require("@sustainers/test-cli-template");
const hash = require("@sustainers/hash-string");
const fs = require("fs-extra");
const path = require("path");
const { green } = require("chalk");

module.exports = async args => {
  //eslint-disable-next-line no-console
  console.log(roboSay("Running your tests..."));
  const input = await normalize({
    entrypointType: "path",
    entrypointDefault: ".",
    args,
    flags: [
      {
        name: "test-only",
        short: "t",
        type: Boolean,
        default: false
      },
      {
        name: "env",
        type: String,
        short: "e",
        default: "staging"
      }
    ]
  });

  const workingDir = path.resolve(__dirname, "tmp");

  fs.removeSync(workingDir);
  fs.mkdirSync(workingDir);
  await mergeCliTemplate({
    templateDir: __dirname,
    workingDir,
    input,
    customConfigFn: config => {
      const hashedTarget = hash(
        config.target.id + config.target.domain + config.target.context
      ).toString;

      return {
        _ACTION: config.action,
        _DOMAIN: config.domain,
        //Need a unique id because stand alone string is too long and
        //often breaks the 65 word char limit for domain mapping.
        _TARGET_HASH: hashedTarget,
        _TARGET_ID: config.target.id,
        _TARGET_DOMAIN: config.target.domain,
        _TARGET_CONTEXT: config.target.context
      };
    }
  });

  await testCliTemplate(workingDir);

  if (!input.testOnly) {
    //eslint-disable-next-line no-console
    console.log(
      roboSay(
        "Deploying your event handler... It might take 5 minutes or so, maybe 4 on a good day."
      )
    );
    await deployCliTemplate(workingDir);
  }
  fs.removeSync(workingDir);

  //eslint-disable-next-line no-console
  console.log(roboSay("Woohoo!"), green.bold("done"));
};
