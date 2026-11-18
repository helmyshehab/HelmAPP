export interface paths {
  "/v1/health": {
    get: {
      responses: {
        200: {
          content: {
            "application/json": {
              status: "ok";
              service: string;
              timestamp?: string;
            };
          };
        };
      };
    };
  };
  "/v1/meta": {
    get: {
      responses: {
        200: {
          content: {
            "application/json": {
              name: string;
              version: string;
              apiVersion: string;
            };
          };
        };
      };
    };
  };
}

export type HealthResponse =
  paths["/v1/health"]["get"]["responses"][200]["content"]["application/json"];
export type MetaResponse =
  paths["/v1/meta"]["get"]["responses"][200]["content"]["application/json"];
