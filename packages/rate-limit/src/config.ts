export type RateLimitRule = {
  limit: number;
  windowSeconds: number;
};

export type EndpointRateLimitConfig = {
  methods?: string[];
  pathnamePattern: RegExp;
  /** Stable bucket id (avoid raw paths with dynamic segments in metrics). */
  id: string;
  rule: RateLimitRule;
};

/** Per-endpoint limits for public HTTP APIs. */
export const ENDPOINT_RATE_LIMITS: EndpointRateLimitConfig[] = [
  {
    id: "webhooks.stripe",
    pathnamePattern: /^\/api\/webhooks\/stripe$/,
    methods: ["POST"],
    rule: { limit: 120, windowSeconds: 60 },
  },
  {
    id: "music.oauth.callback",
    pathnamePattern: /^\/api\/music\/[^/]+\/callback$/,
    methods: ["GET"],
    rule: { limit: 40, windowSeconds: 60 },
  },
  {
    id: "music.oauth.authorize",
    pathnamePattern: /^\/api\/music\/[^/]+\/authorize$/,
    methods: ["GET"],
    rule: { limit: 30, windowSeconds: 60 },
  },
  {
    id: "music.apple.connect",
    pathnamePattern: /^\/api\/music\/apple\/connect$/,
    methods: ["POST"],
    rule: { limit: 20, windowSeconds: 60 },
  },
  {
    id: "music.apple.developer-token",
    pathnamePattern: /^\/api\/music\/apple\/developer-token$/,
    methods: ["GET"],
    rule: { limit: 60, windowSeconds: 60 },
  },
  {
    id: "auth.callback",
    pathnamePattern: /^\/auth\/callback$/,
    methods: ["GET"],
    rule: { limit: 40, windowSeconds: 60 },
  },
  {
    id: "health",
    pathnamePattern: /^\/health$/,
    methods: ["GET"],
    rule: { limit: 120, windowSeconds: 60 },
  },
  {
    id: "socket.connect",
    pathnamePattern: /^\/socket\.io\/?$/,
    methods: ["GET", "POST"],
    rule: { limit: 200, windowSeconds: 60 },
  },
];

/** Default bucket for unmatched `/api/*` routes. */
export const DEFAULT_API_RATE_LIMIT: RateLimitRule = {
  limit: 60,
  windowSeconds: 60,
};

/** Global cap per IP across all rate-limited HTTP traffic. */
export const GLOBAL_IP_RATE_LIMIT: RateLimitRule = {
  limit: 300,
  windowSeconds: 60,
};

export function resolveEndpointConfig(
  method: string,
  pathname: string
): { endpointId: string; rule: RateLimitRule } {
  const upperMethod = method.toUpperCase();
  for (const cfg of ENDPOINT_RATE_LIMITS) {
    if (!cfg.pathnamePattern.test(pathname)) continue;
    if (cfg.methods && !cfg.methods.includes(upperMethod)) continue;
    return { endpointId: cfg.id, rule: cfg.rule };
  }

  if (pathname.startsWith("/api/")) {
    return { endpointId: "api.default", rule: DEFAULT_API_RATE_LIMIT };
  }

  return { endpointId: "http.default", rule: DEFAULT_API_RATE_LIMIT };
}
