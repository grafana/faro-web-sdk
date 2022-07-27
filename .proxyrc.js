module.exports = function (app) {
  app.use('/collect', (_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application.json' });
    res.end('{}');
  });
};
