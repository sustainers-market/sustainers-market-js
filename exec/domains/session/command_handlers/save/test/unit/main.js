const { expect } = require("chai")
  .use(require("chai-datetime"))
  .use(require("sinon-chai"));
const { restore, replace, fake, stub, useFakeTimers } = require("sinon");

const main = require("../../main");
const deps = require("../../deps");

let clock;
const now = new Date();

const phone = "some-phone";
const payload = { phone };
const token = "some-token";
const context = "some-context";

const sub = "some-sub";
const session = {
  sub
};

const principle = "some-principle";
const identity = {
  state: {
    principle
  }
};
const principleAggregate = { permissions: ["some-permission"] };
const sessionPrincipleAggregate = { permissions: ["some-other-permission"] };

describe("Command handler unit tests", () => {
  beforeEach(() => {
    clock = useFakeTimers(now.getTime());
  });
  afterEach(() => {
    clock.restore();
    restore();
  });
  it("should return successfully if identity is found", async () => {
    const queryFake = fake.returns([identity]);
    const setFake = fake.returns({
      query: queryFake
    });
    const eventStoreFake = fake.returns({
      set: setFake
    });
    replace(deps, "eventStore", eventStoreFake);

    const aggregateFake = stub()
      .onFirstCall()
      .returns({
        aggregate: principleAggregate
      })
      .onSecondCall()
      .returns({
        aggregate: sessionPrincipleAggregate
      });

    const issueFake = fake.returns({ token });
    const anotherSetFake = fake.returns({
      issue: issueFake
    });
    const commandFake = fake.returns({
      set: anotherSetFake
    });

    replace(deps, "command", commandFake);

    const result = await main({
      payload,
      context,
      session,
      aggregateFn: aggregateFake
    });

    expect(result).to.deep.equal({
      response: { token }
    });
    expect(eventStoreFake).to.have.been.calledWith({ domain: "identity" });
    expect(setFake).to.have.been.calledWith({
      context,
      tokenFn: deps.gcpToken
    });
    expect(queryFake).to.have.been.calledWith({ key: "phone", value: phone });
    expect(aggregateFake).to.have.been.calledWith(principle, {
      domain: "principle"
    });
    expect(aggregateFake).to.have.been.calledWith(sub, {
      domain: "principle"
    });
    expect(aggregateFake).to.have.been.calledTwice;
    expect(commandFake).to.have.been.calledWith({
      action: "issue",
      domain: "challenge"
    });
    expect(anotherSetFake).to.have.been.calledWith({
      context,
      tokenFn: deps.gcpToken,
      options: {
        principle,
        events: [
          {
            action: "add-permissions",
            domain: "principle",
            root: principle,
            payload: {
              permissions: ["some-other-permission"]
            }
          }
        ]
      }
    });
    expect(issueFake).to.have.been.calledWith({ phone });
  });
  it("should return successfully if identity is found and there are no new permissions to add", async () => {
    const queryFake = fake.returns([identity]);
    const setFake = fake.returns({
      query: queryFake
    });
    const eventStoreFake = fake.returns({
      set: setFake
    });
    replace(deps, "eventStore", eventStoreFake);

    const aggregateFake = stub()
      .onFirstCall()
      .returns({
        aggregate: principleAggregate
      })
      .onSecondCall()
      .returns({
        aggregate: principleAggregate
      });

    const issueFake = fake.returns({ token });
    const anotherSetFake = fake.returns({
      issue: issueFake
    });
    const commandFake = fake.returns({
      set: anotherSetFake
    });

    replace(deps, "command", commandFake);

    const result = await main({
      payload,
      context,
      session,
      aggregateFn: aggregateFake
    });

    expect(result).to.deep.equal({
      response: { token }
    });
    expect(eventStoreFake).to.have.been.calledWith({ domain: "identity" });
    expect(setFake).to.have.been.calledWith({
      context,
      tokenFn: deps.gcpToken
    });
    expect(queryFake).to.have.been.calledWith({ key: "phone", value: phone });
    expect(aggregateFake).to.have.been.calledWith(principle, {
      domain: "principle"
    });
    expect(aggregateFake).to.have.been.calledWith(sub, {
      domain: "principle"
    });
    expect(aggregateFake).to.have.been.calledTwice;
    expect(commandFake).to.have.been.calledWith({
      action: "issue",
      domain: "challenge"
    });
    expect(anotherSetFake).to.have.been.calledWith({
      context,
      tokenFn: deps.gcpToken,
      options: {
        principle,
        events: []
      }
    });
    expect(issueFake).to.have.been.calledWith({ phone });
  });
  it("should return successfully if principle not found with no subject", async () => {
    const queryFake = fake.returns([]);
    const setFake = fake.returns({
      query: queryFake
    });
    const eventStoreFake = fake.returns({
      set: setFake
    });
    replace(deps, "eventStore", eventStoreFake);

    const identityRoot = "some-new-identity-root";
    const principleRoot = "some-new-principle-root";

    const uuidFake = stub()
      .onFirstCall()
      .returns(identityRoot)
      .onSecondCall()
      .returns(principleRoot);
    replace(deps, "uuid", uuidFake);

    const phoneHash = "some-phone-hash";
    const hashFake = fake.returns(phoneHash);
    replace(deps, "hash", hashFake);

    const issueFake = fake.returns({ token });
    const anotherSetFake = fake.returns({
      issue: issueFake
    });
    const commandFake = fake.returns({
      set: anotherSetFake
    });

    replace(deps, "command", commandFake);

    const result = await main({
      payload,
      context,
      session: {}
    });

    expect(result).to.deep.equal({
      response: { token }
    });
    expect(eventStoreFake).to.have.been.calledWith({ domain: "identity" });
    expect(setFake).to.have.been.calledWith({
      context,
      tokenFn: deps.gcpToken
    });
    expect(queryFake).to.have.been.calledWith({ key: "phone", value: phone });
    expect(hashFake).to.have.been.calledWith(phone);
    expect(commandFake).to.have.been.calledWith({
      action: "issue",
      domain: "challenge"
    });
    expect(anotherSetFake).to.have.been.calledWith({
      context,
      tokenFn: deps.gcpToken,
      options: {
        principle: principleRoot,
        events: [
          {
            action: "register",
            domain: "identity",
            root: identityRoot,
            payload: {
              phone: phoneHash,
              principle: principleRoot
            }
          },
          {
            action: "principle",
            domain: "add-permissions",
            root: principleRoot,
            payload: {
              permissions: [`identity:admin:${identityRoot}`]
            }
          }
        ]
      }
    });
    expect(issueFake).to.have.been.calledWith({ phone });
  });
  it("should return successfully if principle not found with subject", async () => {
    const queryFake = fake.returns([]);
    const setFake = fake.returns({
      query: queryFake
    });
    const eventStoreFake = fake.returns({
      set: setFake
    });
    replace(deps, "eventStore", eventStoreFake);

    const identityRoot = "some-new-identity-root";

    const uuidFake = fake.returns(identityRoot);
    replace(deps, "uuid", uuidFake);

    const phoneHash = "some-phone-hash";
    const hashFake = fake.returns(phoneHash);
    replace(deps, "hash", hashFake);

    const issueFake = fake.returns({ token });
    const anotherSetFake = fake.returns({
      issue: issueFake
    });
    const commandFake = fake.returns({
      set: anotherSetFake
    });

    replace(deps, "command", commandFake);

    const result = await main({
      payload,
      context,
      session
    });

    expect(result).to.deep.equal({
      response: { token }
    });
    expect(eventStoreFake).to.have.been.calledWith({ domain: "identity" });
    expect(setFake).to.have.been.calledWith({
      context,
      tokenFn: deps.gcpToken
    });
    expect(queryFake).to.have.been.calledWith({ key: "phone", value: phone });
    expect(hashFake).to.have.been.calledWith(phone);
    expect(commandFake).to.have.been.calledWith({
      action: "issue",
      domain: "challenge"
    });
    expect(anotherSetFake).to.have.been.calledWith({
      context,
      tokenFn: deps.gcpToken,
      options: {
        principle: sub,
        events: [
          {
            action: "register",
            domain: "identity",
            root: identityRoot,
            payload: {
              phone: phoneHash,
              principle: sub
            }
          },
          {
            action: "principle",
            domain: "add-permissions",
            root: sub,
            payload: {
              permissions: [`identity:admin:${identityRoot}`]
            }
          }
        ]
      }
    });
    expect(issueFake).to.have.been.calledWith({ phone });
  });
  it("should return nothing if sub is the identity's principle", async () => {
    const queryFake = fake.returns([{ state: { principle: sub } }]);
    const setFake = fake.returns({
      query: queryFake
    });
    const eventStoreFake = fake.returns({
      set: setFake
    });
    replace(deps, "eventStore", eventStoreFake);

    const result = await main({
      payload,
      context,
      session
    });

    expect(result).to.deep.equal({});
  });
  it("should throw correctly", async () => {
    const errorMessage = "some-error";

    const queryFake = fake.rejects(errorMessage);
    const setFake = fake.returns({
      query: queryFake
    });
    const eventStoreFake = fake.returns({
      set: setFake
    });
    replace(deps, "eventStore", eventStoreFake);

    try {
      await main({
        payload,
        context,
        session
      });
      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(e.message).to.equal(errorMessage);
    }
  });
});
