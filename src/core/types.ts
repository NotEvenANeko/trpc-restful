export type RESTfulMeta<TMeta extends Record<string, unknown>> = TMeta & {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path?: string;
};
