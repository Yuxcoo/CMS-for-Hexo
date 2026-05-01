import { z } from 'zod';

const authConfigSchema = z.object({
  ADMIN_PASSWORD: z.string().min(1),
  SESSION_SECRET: z.string().min(1)
});

const configSchema = authConfigSchema.extend({
  GITHUB_TOKEN: z.string().min(1),
  GITHUB_OWNER: z.string().optional(),
  GITHUB_REPO: z.string().optional(),
  GITHUB_BRANCH: z.string().default('main'),
  HEXO_POSTS_DIR: z.string().default('source/_posts'),
  HEXO_DRAFTS_DIR: z.string().default('source/_drafts'),
  HEXO_IMAGES_DIR: z.string().default('source/images'),
  GITHUB_WORKFLOW_ID: z.string().optional()
});

export type AppConfig = z.infer<typeof configSchema>;
export type AuthConfig = z.infer<typeof authConfigSchema>;

let cachedConfig: AppConfig | null = null;
let cachedAuthConfig: AuthConfig | null = null;

export function getAuthConfig(): AuthConfig {
  if (cachedAuthConfig) return cachedAuthConfig;
  const parsed = authConfigSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Missing or invalid auth environment variables: ${details}`);
  }
  cachedAuthConfig = parsed.data;
  return cachedAuthConfig;
}

export function getConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;
  const parsed = configSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Missing or invalid environment variables: ${details}`);
  }
  cachedConfig = parsed.data;
  return cachedConfig;
}

export function getPublicConfigStatus() {
  try {
    const authConfig = getAuthConfig();
    const config = getConfig();
    return {
      ok: true,
      auth: {
        adminPasswordSet: Boolean(authConfig.ADMIN_PASSWORD),
        adminPasswordLength: authConfig.ADMIN_PASSWORD.length,
        sessionSecretSet: Boolean(authConfig.SESSION_SECRET),
        sessionSecretLength: authConfig.SESSION_SECRET.length
      },
      repo: config.GITHUB_OWNER && config.GITHUB_REPO ? `${config.GITHUB_OWNER}/${config.GITHUB_REPO}` : null,
      branch: config.GITHUB_BRANCH,
      postsDir: config.HEXO_POSTS_DIR,
      draftsDir: config.HEXO_DRAFTS_DIR,
      imagesDir: config.HEXO_IMAGES_DIR,
      workflow: config.GITHUB_WORKFLOW_ID || null
    };
  } catch (error) {
    const authParsed = authConfigSchema.safeParse(process.env);
    return {
      ok: false,
      auth: authParsed.success
        ? {
            adminPasswordSet: Boolean(authParsed.data.ADMIN_PASSWORD),
            adminPasswordLength: authParsed.data.ADMIN_PASSWORD.length,
            sessionSecretSet: Boolean(authParsed.data.SESSION_SECRET),
            sessionSecretLength: authParsed.data.SESSION_SECRET.length
          }
        : null,
      error: error instanceof Error ? error.message : 'Configuration error'
    };
  }
}
