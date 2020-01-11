const { expect } = require("chai").use(require("sinon-chai"));
const { restore, replace, fake } = require("sinon");

const get = require("..");
const deps = require("../deps");

const found = "some-objs";
const root = "some-root";

describe("Event store get", () => {
  afterEach(() => {
    restore();
  });
  it("should call with the correct params", async () => {
    const aggregateFnFake = fake.returns(found);
    const params = {
      root
    };
    const req = {
      params
    };
    const sendFake = fake();
    const res = {
      send: sendFake
    };
    await get({ aggregateFn: aggregateFnFake })(req, res);
    expect(aggregateFnFake).to.have.been.calledWith(root);
    expect(sendFake).to.have.been.calledWith(found);
  });
  it("should throw correctly if not found", async () => {
    const aggregateFnFake = fake();
    const params = {
      root
    };
    const req = {
      params
    };
    const res = {};

    const error = "some-error";
    const rootNotFoundFake = fake.returns(error);
    replace(deps, "resourceNotFoundError", {
      root: rootNotFoundFake
    });

    try {
      await get({ aggregateFn: aggregateFnFake })(req, res);

      //shouldn't get called
      expect(2).to.equal(1);
    } catch (e) {
      expect(e).to.equal(error);
    }
  });
});
