import type { Meta, MetaItem } from '@grafana/faro-core';

/**
 * Current page state
 */
let currentPageUrl: string | undefined;
let currentPageId: string | undefined;

/**
 * Sets the current page/screen information
 * @param screenName - The name of the current screen
 */
export function setCurrentPage(screenName: string): void {
  currentPageUrl = `screen://${screenName}`;
  currentPageId = screenName;
}

/**
 * Gets the current page/screen information
 */
export function getCurrentPage(): { url: string; id: string } | undefined {
  if (!currentPageUrl || !currentPageId) {
    return undefined;
  }
  return {
    url: currentPageUrl,
    id: currentPageId,
  };
}

/**
 * Creates the page meta provider for React Native
 * This provides page.url and page.id which Grafana uses for Page Performance views
 */
export function createPageMeta(): MetaItem<Pick<Meta, 'page'>> {
  const pageMeta: MetaItem<Pick<Meta, 'page'>> = () => {
    const currentPage = getCurrentPage();

    if (!currentPage) {
      // Return a default page meta if no screen has been set yet
      return {
        page: {
          url: 'screen://unknown',
          id: 'unknown',
        },
      };
    }

    return {
      page: currentPage,
    };
  };

  return pageMeta;
}
