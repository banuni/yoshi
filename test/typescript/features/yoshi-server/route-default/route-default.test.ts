import Scripts from '../../../../scripts';

const scripts = Scripts.setupProjectFromTemplate({
  templateDir: __dirname,
  projectType: 'yoshi-server-typescript',
});

describe.each(['prod', 'dev'] as const)(
  'yoshi-server default route [%s]',
  mode => {
    it('run tests', async () => {
      await scripts[mode](async () => {
        await page.goto(`${scripts.serverUrl}`);
        const title = await page.$eval('h1', elm => elm.textContent);
        expect(title).toBe('hello from yoshi server');
      });
    });
  },
);

describe.each(['prod', 'dev'] as const)(
  'yoshi-server nested default route [%s]',
  mode => {
    it('Integration tests', async () => {
      await scripts[mode](async () => {
        await page.goto(`${scripts.serverUrl}/app`);
        const title = await page.$eval('h1', elm => elm.textContent);
        expect(title).toBe('hello from yoshi app server');
      });
    });
  },
);
