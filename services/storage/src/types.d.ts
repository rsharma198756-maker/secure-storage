import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    serviceClaims?: {
      kind: "system" | "user";
      scope: string;
      userId?: string;
    };
  }
}
