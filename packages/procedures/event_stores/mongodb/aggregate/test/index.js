const { expect } = require("chai").use(require("sinon-chai"));
const { restore, replace, fake } = require("sinon");
const aggregate = require("..");

const deps = require("../deps");

const root = "some-root";
const action = "some-action";
const otherAction = "some-other-action";
const findResult = [
  { data: { root, number: 1, payload: { b: 2, c: 2 }, headers: { action } } },
  {
    data: {
      root,
      number: 2,
      payload: { c: 3, d: 4 },
      headers: { action: otherAction },
    },
  },
];
const handlers = {
  [action]: (state, payload) => {
    return {
      ...state,
      ...payload,
    };
  },
  [otherAction]: (state, payload) => {
    return {
      ...state,
      ...payload,
      e: 5,
    };
  },
};
const findOneResult = {
  root,
  state: { a: 1, b: 1 },
  lastEventNumber: 0,
};

const eventStore = "some-event-store";
const snapshotStore = "some-snapshot-store";

describe("Mongodb event store aggregate", () => {
  afterEach(() => {
    restore();
  });
  it("should call with the correct params", async () => {
    const findFake = fake.returns(findResult);
    const findOneFake = fake.returns(findOneResult);

    const db = {
      find: findFake,
      findOne: findOneFake,
    };

    replace(deps, "db", db);

    const result = await aggregate({ handlers, eventStore, snapshotStore })(
      root
    );

    expect(findFake).to.have.been.calledWith({
      store: eventStore,
      query: {
        "data.root": root,
      },
      sort: {
        "data.number": 1,
      },
      options: {
        lean: true,
      },
    });
    expect(findOneFake).to.have.been.calledWith({
      store: snapshotStore,
      query: {
        root,
      },
      options: {
        lean: true,
      },
    });
    expect(result).to.deep.equal({
      root,
      state: { a: 1, b: 2, c: 3, d: 4, e: 5 },
      lastEventNumber: 2,
    });
  });
  it("should call with the correct params with no snapshot found", async () => {
    const findFake = fake.returns(findResult);
    const findOneFake = fake.returns();

    const db = {
      find: findFake,
      findOne: findOneFake,
    };

    replace(deps, "db", db);

    const result = await aggregate({ handlers, eventStore, snapshotStore })(
      root
    );

    expect(findFake).to.have.been.calledWith({
      store: eventStore,
      query: {
        "data.root": root,
      },
      sort: {
        "data.number": 1,
      },
      options: {
        lean: true,
      },
    });
    expect(findOneFake).to.have.been.calledWith({
      store: snapshotStore,
      query: {
        root,
      },
      options: {
        lean: true,
      },
    });
    expect(result).to.deep.equal({
      root,
      state: { b: 2, c: 3, d: 4, e: 5 },
      lastEventNumber: 2,
    });
  });
  it("should call with the correct params with no snapshot or events found", async () => {
    const findFake = fake.returns([]);
    const findOneFake = fake.returns();

    const db = {
      find: findFake,
      findOne: findOneFake,
    };

    replace(deps, "db", db);

    const result = await aggregate({ handlers, eventStore, snapshotStore })(
      root
    );

    expect(findFake).to.have.been.calledWith({
      store: eventStore,
      query: {
        "data.root": root,
      },
      sort: {
        "data.number": 1,
      },
      options: {
        lean: true,
      },
    });
    expect(findOneFake).to.have.been.calledWith({
      store: snapshotStore,
      query: {
        root,
      },
      options: {
        lean: true,
      },
    });
    expect(result).to.be.null;
  });
  it("should throw if a handler isn't specified", async () => {
    const findFake = fake.returns(findResult);
    const findOneFake = fake.returns(findOneResult);

    const db = {
      find: findFake,
      findOne: findOneFake,
    };

    replace(deps, "db", db);

    const error = new Error();
    const messageFake = fake.returns(error);
    replace(deps, "badRequestError", {
      message: messageFake,
    });
    try {
      await aggregate({ handlers: {}, eventStore, snapshotStore })(root);
      //shouldn't get called
      expect(1).to.equal(2);
    } catch (e) {
      expect(messageFake).to.have.been.calledWith(
        "Event handler not specified.",
        {
          info: {
            action,
          },
        }
      );
      expect(e).to.equal(error);
    }
  });
});
