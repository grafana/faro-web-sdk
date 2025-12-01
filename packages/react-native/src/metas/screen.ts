import { isFunction, type Meta, type MetaItem } from '@grafana/faro-core';

let currentScreen: string | undefined;
let screenId: string | undefined;

type CreateScreenMetaProps = {
  generateScreenId?: (screenName: string) => string;
  initialScreenMeta?: Meta['page'];
};

/**
 * Screen meta for React Native
 * Tracks the current screen name instead of URL (as in web page meta)
 */
export function createScreenMeta({
  generateScreenId,
  initialScreenMeta,
}: CreateScreenMetaProps = {}): MetaItem<Pick<Meta, 'page'>> {
  const screenMeta: MetaItem<Pick<Meta, 'page'>> = () => {
    const screenName = currentScreen || 'unknown';

    if (generateScreenId !== undefined && isFunction(generateScreenId) && currentScreen !== screenName) {
      screenId = generateScreenId(screenName);
    }

    return {
      page: {
        url: `screen://${screenName}`,
        ...(screenId ? { id: screenId } : {}),
        ...initialScreenMeta,
      },
    };
  };

  return screenMeta;
}

/**
 * Updates the current screen name
 * Called by navigation instrumentation when screen changes
 */
export function setCurrentScreen(screenName: string): void {
  currentScreen = screenName;
}

/**
 * Gets the current screen name
 */
export function getCurrentScreen(): string | undefined {
  return currentScreen;
}

/**
 * Default screen meta with no custom configuration
 */
export const getScreenMeta = (): MetaItem<Pick<Meta, 'page'>> => {
  return createScreenMeta();
};
