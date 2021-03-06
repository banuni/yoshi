import 'isomorphic-fetch';
import createController from '../src/components/todo/controller';
import { EXPERIMENTS_SCOPE } from '../src/config/constants';
import { mockExperiments } from '../src/components/button/controller.spec';

describe('createControllers', () => {
  let widgetConfig: any;
  beforeEach(() => {
    widgetConfig = {
      appParams: {
        baseUrls: {
          staticsBaseUrl: 'http://localhost:3200/',
        },
      },
      wixCodeApi: {
        window: {
          multilingual: {
            isEnabled: false,
          },
        },
        site: {
          language: 'en',
        },
      },
    };
  });

  it('should return controllers with pageReady method given widgets config', async () => {
    const experiments = { someExperiment: 'true' };
    mockExperiments(EXPERIMENTS_SCOPE, experiments);

    const result = createController.call(
      { state: {}, setState: () => {} },
      {
        frameworkData: {
          experimentsPromise: () => Promise.resolve(experiments),
        },
        widgetConfig,
      },
    );
    await expect(result).resolves.toHaveProperty('methods');
    await expect(result).resolves.toHaveProperty('corvid');
  });
});
