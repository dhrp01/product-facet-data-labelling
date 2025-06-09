export type Facets = Record<string, string[] | string >;

export type Product = {
  vendor?: string;
  [key: string]: any;
};