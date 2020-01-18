module.exports = ({ mainFn }) => {
  return async (req, res) => {
    await mainFn({ payload: req.body.payload });

    // const context = req.context;

    res.status(204).send();
  };
};
