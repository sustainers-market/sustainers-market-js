const deps = require("./deps");

module.exports = async ({
  aggregateFn,
  saveEventsFn,
  queryFn,
  streamFn,
  reserveRootCountsFn,
  publishFn,
  hashFn,
  rootStreamFn,
  countFn,
} = {}) => {
  deps
    .server()
    .get(deps.stream({ streamFn }), {
      path: "/stream/:root?",
    })
    .get(deps.count({ countFn }), {
      path: "/count/:root",
    })
    .get(deps.rootStream({ rootStreamFn }), {
      path: "/roots",
    })
    .get(deps.get({ aggregateFn, queryFn }), { path: "/:root?" })
    .post(
      deps.post({
        saveEventsFn,
        reserveRootCountsFn,
        publishFn,
        hashFn,
      })
    )
    .listen();
};
