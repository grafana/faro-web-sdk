/**
 * Interface used to provide information to finish span on fetch error
 */
export interface FetchError {
  status?: number;
  message: string;
}
