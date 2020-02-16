import path from 'path';
import fs from 'fs-extra';
import Scripts from '../../../scripts';

jest.setTimeout(60 * 1000);

const scripts = Scripts.setupProjectFromTemplate({
  templateDir: __dirname,
  projectType: 'typescript',
});

describe.each(['prod'] as const)('stats [%s]', mode => {
  it('integration', async () => {
    await scripts[mode](
      async () => {
        const statsFilePath = path.join(
          scripts.testDirectory,
          'target/webpack-stats.json',
        );

        expect(fs.existsSync(statsFilePath)).toBeTruthy();
      },
      { extraArgs: ['--stats'] },
    );
  });
});
