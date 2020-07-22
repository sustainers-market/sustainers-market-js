const deps = require("./deps");

module.exports = ({
  saveSnapshotFn,
  hashFn,
  aggregateFn,
  rootStreamFn,
  latestBlockFn,
  saveBlockFn,
  public,
}) => async (transaction) => {
  const previousBlock = await latestBlockFn();

  if (!previousBlock) {
    const genesisData = ["Wherever you go, there you are."];
    const genesisPrevious = "~";
    const merkleRoot = deps.merkleRoot({
      data: [...genesisData, genesisPrevious],
      hashFn,
    });

    const genesisBlock = {
      hash: merkleRoot,
      previous: genesisPrevious,
      data: genesisData,
      count: 1,
      number: 0,
      boundary: "2000-01-01T05:00:00.000+00:00",
      network: process.env.NETWORK,
      service: process.env.SERVICE,
      domain: process.env.DOMAIN,
    };

    await saveBlockFn({
      block: genesisBlock,
      ...(transaction && { transaction }),
    });

    return;
  }

  const snapshots = [];

  const boundary = deps.dateString();

  await rootStreamFn({
    updatedOnOrAfter: previousBlock.boundary,
    updatedBefore: boundary,
    fn: async ({ root }) => {
      const aggregate = await aggregateFn(root);

      if (aggregate.events.length == 0) return;

      const stringifiedEvents = aggregate.events.map((e) =>
        public ? deps.cononicalString(e) : e.hash
      );
      const previousHash = aggregate.snapshotHash;
      const merkleRoot = await deps.merkleRoot({
        data: [...stringifiedEvents, ...(previousHash ? [previousHash] : [])],
        hashFn,
      });

      const data = {
        hash: merkleRoot,
        ...(previousHash && { previous: previousHash }),
        data: stringifiedEvents,
        count: stringifiedEvents.length,
        public,
        lastEventNumber: aggregate.lastEventNumber,
        root,
        state: aggregate.state,
      };

      const hash = await hashFn(data);

      const normalizedSnapshot = {
        data,
        hash,
      };

      const snapshot = await saveSnapshotFn({
        snapshot: normalizedSnapshot,
        ...(transaction && { transaction }),
      });

      snapshots.push(snapshot);
    },
    parallel: 100,
  });

  const stringifiedSnapshots = snapshots.map((s) => deps.cononicalString(s));
  const merkleRoot = await deps.merkleRoot({
    data: [...stringifiedSnapshots, previousBlock.hash],
    hashFn,
  });

  const normalizedBlock = {
    hash: merkleRoot,
    previous: previousBlock.hash,
    data: stringifiedSnapshots,
    count: stringifiedSnapshots.length,
    number: previousBlock.number + 1,
    boundary,
    network: process.env.NETWORK,
    service: process.env.SERVICE,
    domain: process.env.DOMAIN,
  };

  await saveBlockFn({
    block: normalizedBlock,
    ...(transaction && { transaction }),
  });
};
