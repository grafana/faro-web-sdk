/**
 * React Navigation dependencies that need to be provided by the user
 */
export interface ReactNavigationDependencies {
  useNavigation: () => any;
  useRoute: () => any;
  useNavigationState: (selector: (state: any) => any) => any;
}

/**
 * Configuration for React Navigation integration
 */
export interface ReactNavigationConfig {
  dependencies: ReactNavigationDependencies;
}
