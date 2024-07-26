export type RESTfulMeta<TMeta extends Record<string, unknown> = {}> = TMeta & {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path?: string;
};

export type Serializable =
  | string
  | number
  | boolean
  | null
  | undefined
  | Serializable[]
  | { [key: string]: Serializable };
