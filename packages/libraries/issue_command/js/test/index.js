const { expect } = require("chai")
  .use(require("chai-datetime"))
  .use(require("sinon-chai"));
const { restore, replace, fake, useFakeTimers } = require("sinon");
const datetime = require("@sustainers/datetime");

const deps = require("../deps");
const issueCommand = require("..");

let clock;

const now = new Date();

const action = "some-action!";
const domain = "some-domain!";

const payload = { a: 1 };
const trace = "some-trace";
const source = "some-source";

const context = { c: 2 };

describe("Issue command", () => {
  beforeEach(() => {
    clock = useFakeTimers(now.getTime());
  });
  afterEach(() => {
    clock.restore();
    restore();
  });

  it("should call with the correct params", async () => {
    const post = fake();
    const operation = fake.returns({
      post
    });
    replace(deps, "operation", operation);

    await issueCommand({ action, domain })
      .with(payload, { trace, source })
      .in(context);

    expect(operation).to.have.been.calledWith(`${action}.${domain}`);
    expect(post).to.have.been.calledWith({
      data: {
        payload,
        header: {
          issued: datetime.fineTimestamp(),
          trace,
          source
        }
      },
      context
    });
  });
  it("should call with the correct optional params", async () => {
    const post = fake();
    const operation = fake.returns({
      post
    });
    replace(deps, "operation", operation);

    await issueCommand({ action, domain })
      .with(payload)
      .in(context);

    expect(operation).to.have.been.calledWith(`${action}.${domain}`);
    expect(post).to.have.been.calledWith({
      data: {
        payload,
        header: {
          issued: datetime.fineTimestamp()
        }
      },
      context
    });
  });
});
