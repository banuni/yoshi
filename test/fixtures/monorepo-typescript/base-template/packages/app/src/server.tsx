import ejs from 'ejs';
import express from 'express';

const app = express();

app.get('/', async (req, res) => {
  res.send(await ejs.renderFile('./packages/app/src/index.ejs'));
});

app.listen(process.env.PORT);
