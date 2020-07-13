const { store } = require("@blossm/mongodb-database");
const { string: dateString } = require("@blossm/datetime");
const eventStore = require("@blossm/event-store");
const saveEvents = require("@blossm/mongodb-event-store-save-events");
const aggregate = require("@blossm/mongodb-event-store-aggregate");
const reserveRootCounts = require("@blossm/mongodb-event-store-reserve-root-counts");
const query = require("@blossm/mongodb-event-store-query");
const stream = require("@blossm/mongodb-event-store-stream");
const rootStream = require("@blossm/mongodb-event-store-root-stream");
const count = require("@blossm/mongodb-event-store-count");
const updateProof = require("@blossm/mongodb-event-store-update-proof");
const saveProofs = require("@blossm/mongodb-event-store-save-proofs");
const getProof = require("@blossm/mongodb-event-store-get-proof");
const createTransaction = require("@blossm/mongodb-event-store-create-transaction");
const formatSchema = require("@blossm/format-mongodb-schema");

exports.dateString = dateString;
exports.eventStore = eventStore;
exports.db = { store };
exports.saveEvents = saveEvents;
exports.aggregate = aggregate;
exports.reserveRootCounts = reserveRootCounts;
exports.query = query;
exports.stream = stream;
exports.rootStream = rootStream;
exports.updateProof = updateProof;
exports.getProof = getProof;
exports.createTransaction = createTransaction;
exports.count = count;
exports.formatSchema = formatSchema;
exports.saveProofs = saveProofs;
