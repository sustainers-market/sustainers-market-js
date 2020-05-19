const { expect } = require("chai").use(require("sinon-chai"));
const { restore, replace, fake } = require("sinon");

const get = require("..");
const deps = require("../deps");

const obj = { a: "some-obj" };
const sort = { a: "1" };
const root = "some-root";
const objRoot = "some-obj-root";
const count = "some-count";

const envContext = "some-env-context";
const envContextRoot = "some-env-context-root";
const envContextService = "some-env-context-service";
const envContextNetwork = "some-env-context-network";

const envName = "some-env-name";
const envDomain = "some-env-domain";
const envService = "some-env-service";
const envNetwork = "some-env-network";
const coreNetwork = "some-core-network";

const nextUrl = "some-next-url";

const context = {
  [envContext]: {
    root: envContextRoot,
    service: envContextService,
    network: envContextNetwork,
  },
};

process.env.NAME = envName;
process.env.CONTEXT = envContext;
process.env.NETWORK = envNetwork;
process.env.CORE_NETWORK = coreNetwork;

describe("View store get", () => {
  beforeEach(() => {
    process.env.DOMAIN = envDomain;
    process.env.SERVICE = envService;
  });
  afterEach(() => {
    restore();
  });

  it("should call with the correct params", async () => {
    const findFake = fake.returns([{ body: obj, headers: { root: objRoot } }]);
    const countFake = fake.returns(count);

    const params = { root };

    const query = { "some-query-key": 1 };

    const urlEncodeQueryDataFake = fake.returns(nextUrl);
    replace(deps, "urlEncodeQueryData", urlEncodeQueryDataFake);

    const skip = "40";
    const limit = "20";

    const req = {
      query: {
        sort,
        context,
        query,
        skip,
        limit,
      },
      params,
    };

    const sendFake = fake();
    const res = {
      send: sendFake,
    };
    await get({ findFn: findFake, countFn: countFake })(req, res);
    expect(findFake).to.have.been.calledWith({
      limit: 20,
      skip: 40,
      sort: { a: 1 },
      query: {
        "body.some-query-key": 1,
        "headers.some-env-context": {
          root: envContextRoot,
          service: envContextService,
          network: envContextNetwork,
        },
        "headers.some-env-domain": {
          root,
          service: envService,
          network: envNetwork,
        },
      },
    });
    expect(countFake).to.have.been.calledWith({
      query: {
        "body.some-query-key": 1,
        "headers.some-env-context": {
          root: envContextRoot,
          service: envContextService,
          network: envContextNetwork,
        },
        "headers.some-env-domain": {
          root,
          service: envService,
          network: envNetwork,
        },
      },
    });
    expect(urlEncodeQueryDataFake).to.have.been.calledWith(
      `https://v.${envDomain}.${envService}.${envContext}.${envNetwork}/${envName}`,
      {
        sort: { a: 1 },
        context,
        query,
        skip: 60,
        limit: 20,
      }
    );
    expect(sendFake).to.have.been.calledWith({
      content: [{ body: obj, headers: { root: objRoot } }],
      updates:
        "https://updates.some-core-network/channel?query%5Bname%5D=some-env-name&query%5Bcontext%5D=some-env-context&query%5Bnetwork%5D=some-env-network&query%5Bdomain%5D=some-env-domain&query%5Bsome-env-domain%5D%5Broot%5D=some-root&query%5Bsome-env-domain%5D%5Bservice%5D=some-env-service&query%5Bsome-env-domain%5D%5Bnetwork%5D=some-env-network",
      next: nextUrl,
      count,
    });
  });
  it("should call with the correct params with no query and trace in headers", async () => {
    const trace = "some-trace";
    const findFake = fake.returns([
      { body: obj, headers: { root: objRoot, trace } },
    ]);
    const countFake = fake.returns(count);

    const params = { root };

    const urlEncodeQueryDataFake = fake.returns(nextUrl);
    replace(deps, "urlEncodeQueryData", urlEncodeQueryDataFake);

    const req = {
      query: {
        context,
      },
      params,
    };

    const sendFake = fake();
    const res = {
      send: sendFake,
    };
    await get({ findFn: findFake, countFn: countFake })(req, res);
    expect(findFake).to.have.been.calledWith({
      limit: 100,
      skip: 0,
      query: {
        "headers.some-env-context": {
          root: envContextRoot,
          service: envContextService,
          network: envContextNetwork,
        },
        "headers.some-env-domain": {
          root,
          service: envService,
          network: envNetwork,
        },
      },
    });
    expect(countFake).to.have.been.calledWith({
      query: {
        "headers.some-env-context": {
          root: envContextRoot,
          service: envContextService,
          network: envContextNetwork,
        },
        "headers.some-env-domain": {
          root,
          service: envService,
          network: envNetwork,
        },
      },
    });
    expect(urlEncodeQueryDataFake).to.have.been.calledWith(
      `https://v.${envDomain}.${envService}.${envContext}.${envNetwork}/${envName}`,
      {
        context,
        skip: 100,
        limit: 100,
      }
    );
    expect(sendFake).to.have.been.calledWith({
      content: [{ body: obj, headers: { root: objRoot, trace } }],
      updates:
        "https://updates.some-core-network/channel?query%5Bname%5D=some-env-name&query%5Bcontext%5D=some-env-context&query%5Bnetwork%5D=some-env-network&query%5Bdomain%5D=some-env-domain&query%5Bsome-env-domain%5D%5Broot%5D=some-root&query%5Bsome-env-domain%5D%5Bservice%5D=some-env-service&query%5Bsome-env-domain%5D%5Bnetwork%5D=some-env-network",
      next: nextUrl,
      count,
    });
  });
  it("should call with the correct params with no env domain, no params, one as true", async () => {
    const findFake = fake.returns([{ body: obj, headers: { root: objRoot } }]);
    const countFake = fake.returns(count);

    const query = { "some-query-key": 1 };

    const urlEncodeQueryDataFake = fake.returns(nextUrl);
    replace(deps, "urlEncodeQueryData", urlEncodeQueryDataFake);

    const req = {
      query: {
        sort,
        context,
        query,
      },
      params: {},
    };

    const sendFake = fake();
    const res = {
      send: sendFake,
    };

    const otherQuery = { "some-other-query-key": 1 };
    const queryFnFake = fake.returns(otherQuery);
    delete process.env.DOMAIN;
    await get({
      findFn: findFake,
      countFn: countFake,
      one: true,
      queryFn: queryFnFake,
    })(req, res);
    expect(queryFnFake).to.have.been.calledWith(query);
    expect(findFake).to.have.been.calledWith({
      limit: 1,
      skip: 0,
      sort: { a: 1 },
      query: {
        "body.some-other-query-key": 1,
        "headers.some-env-context": {
          root: envContextRoot,
          service: envContextService,
          network: envContextNetwork,
        },
      },
    });
    expect(countFake).to.not.have.been.called;
    expect(sendFake).to.have.been.calledWith({
      content: { body: obj, headers: { root: objRoot } },
      updates:
        "https://updates.some-core-network/channel?query%5Bname%5D=some-env-name&query%5Bcontext%5D=some-env-context&query%5Bnetwork%5D=some-env-network",
    });
  });
  it("should call with the correct params with no env service", async () => {
    const findFake = fake.returns([{ body: obj, headers: { root: objRoot } }]);
    const countFake = fake.returns(count);

    const params = { root };

    const query = { "some-query-key": 1 };

    const urlEncodeQueryDataFake = fake.returns(nextUrl);
    replace(deps, "urlEncodeQueryData", urlEncodeQueryDataFake);

    const req = {
      query: {
        sort,
        context,
        query,
      },
      params,
    };

    const sendFake = fake();
    const res = {
      send: sendFake,
    };
    delete process.env.SERVICE;
    await get({ findFn: findFake, countFn: countFake })(req, res);
    expect(findFake).to.have.been.calledWith({
      limit: 100,
      skip: 0,
      sort: { a: 1 },
      query: {
        "body.some-query-key": 1,
        "headers.some-env-context": {
          root: envContextRoot,
          service: envContextService,
          network: envContextNetwork,
        },
      },
    });
    expect(countFake).to.have.been.calledWith({
      query: {
        "body.some-query-key": 1,
        "headers.some-env-context": {
          root: envContextRoot,
          service: envContextService,
          network: envContextNetwork,
        },
      },
    });
    expect(urlEncodeQueryDataFake).to.have.been.calledWith(
      `https://v.${envContext}.${envNetwork}/${envName}`,
      {
        sort: { a: 1 },
        context,
        query,
        skip: 100,
        limit: 100,
      }
    );
    expect(sendFake).to.have.been.calledWith({
      content: [{ body: obj, headers: { root: objRoot } }],
      updates:
        "https://updates.some-core-network/channel?query%5Bname%5D=some-env-name&query%5Bcontext%5D=some-env-context&query%5Bnetwork%5D=some-env-network",
      next: nextUrl,
      count,
    });
  });
  it("should throw correctly if not found", async () => {
    const findFake = fake.returns([]);
    const countFake = fake.returns(0);

    const params = { root };
    const req = {
      query: {
        context,
      },
      params,
    };

    const sendFake = fake();
    const res = {
      send: sendFake,
    };

    const error = "some-error";
    const messageFake = fake.returns(error);
    replace(deps, "resourceNotFoundError", {
      message: messageFake,
    });

    try {
      await get({ findFn: findFake, countFn: countFake, one: true })(req, res);
    } catch (e) {
      expect(messageFake).to.have.been.calledWith("This view wasn't found.");
      expect(e).to.equal(error);
    }
  });
  it("should throw correctly if wrong context", async () => {
    const findFake = fake.returns([]);
    const countFake = fake.returns(0);

    const params = { root };
    const req = {
      query: {
        context: {},
      },
      params,
    };

    const sendFake = fake();
    const res = {
      send: sendFake,
    };

    const error = "some-error";
    const messageFake = fake.returns(error);
    replace(deps, "forbiddenError", {
      message: messageFake,
    });

    try {
      await get({ findFn: findFake, countFn: countFake, one: true })(req, res);
    } catch (e) {
      expect(messageFake).to.have.been.calledWith(
        "Missing required permissions."
      );
      expect(e).to.equal(error);
    }
  });
});
