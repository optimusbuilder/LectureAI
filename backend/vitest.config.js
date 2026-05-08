import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      UPSTASH_REDIS_REST_URL: '',
      UPSTASH_REDIS_REST_TOKEN: '',
    }
  }
});
