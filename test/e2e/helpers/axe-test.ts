import AxeBuilder from "@axe-core/playwright";

import { test as base } from "../fixtures/auth.fixture";

type AxeFixture = {
  makeAxeBuilder: () => AxeBuilder;
};

export const test = base.extend<AxeFixture>({
  makeAxeBuilder: async ({ page }, use) => {
    const makeAxeBuilder = () =>
      new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"]);

    await use(makeAxeBuilder);
  },
});
export { expect } from "@playwright/test";
