import { readFileSync } from 'fs';
import {
  createTestkit,
  testkitConfigBuilder,
  anAppConfigBuilder,
} from '@wix/business-manager/dist/testkit';

interface TestKitConfigOptions {
  withRandomPorts: boolean;
}

const getTestKitConfig = async (
  { withRandomPorts }: TestKitConfigOptions = { withRandomPorts: false },
) => {
  const serverUrl = 'http://localhost:3200/';
  const path = './templates/module_{%PROJECT_NAME%}.json';
  const serviceId = 'com.wixpress.{%projectName%}';

  const moduleConfig = anAppConfigBuilder()
    .fromJsonTemplate(JSON.parse(readFileSync(path).toString()))
    .withArtifactMapping({ [serviceId]: { url: serverUrl } })
    .build();

  let builder = testkitConfigBuilder()
    .withModulesConfig(moduleConfig)
    .autoLogin();

  if (withRandomPorts) {
    builder = builder.withRandomPorts();
  }

  return builder.build();
};

export const environment = async (envConfig?: TestKitConfigOptions) =>
  createTestkit(await getTestKitConfig(envConfig));
