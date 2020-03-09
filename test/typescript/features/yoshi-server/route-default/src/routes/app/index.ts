import { route, render } from 'yoshi-server';

export default route(async function() {
  const html = await render('app', {
    title: 'hello from yoshi app server',
  });

  return html;
});
