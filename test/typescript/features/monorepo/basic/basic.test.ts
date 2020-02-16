import Scripts from '../../../../scripts';

const scripts = Scripts.setupProjectFromTemplate({
  templateDir: __dirname,
  projectType: 'monorepo-typescript',
});

describe.each(['dev'] as const)('entries [%s]', mode => {
  it('integration', async () => {
    await scripts[mode](async () => {
      await page.goto(`${scripts.serverUrl}`);
      const innerHTML = await page.$eval('#name', elm => elm.textContent);

      expect(innerHTML).toEqual('Hello World!');
    });
  });
});
