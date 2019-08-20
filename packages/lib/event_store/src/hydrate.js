const stream = require("./_stream");

module.exports = ({
  instance,
  tableName,
  rowKeyDelineator,
  columnFamilyId,
  columnQualifier
}) => {
  const table = instance.table(tableName);
  return async ({ root }) => {
    if (!(await table.exists())) return null;
    return new Promise((resolve, reject) => {
      let hydrated = {};
      stream({
        table,
        root,
        rowKeyDelineator
      })
        .on("error", err => reject(err))
        .on("data", row => {
          const data = row.data[columnFamilyId][columnQualifier][0];

          // const event = JSON.parse(data.value);
          const event = data.value;

          hydrated = { ...hydrated, ...event.payload };
        })
        .on("end", () => resolve(hydrated));
    });
  };
};
