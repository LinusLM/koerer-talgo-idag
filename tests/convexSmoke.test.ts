import { describe, it, expect } from 'vitest';

// A minimal smoke test to ensure `convex-test` can be imported in the test environment.
// This doesn't require a running Convex server but verifies the test-time dependency.

describe('convex-test smoke', () => {
    it('loads convex-test package', async () => {
        const mod = await import('convex-test').catch((err) => {
            // Re-throw with clearer message for local debugging
            throw new Error('Failed to import convex-test: ' + String(err));
        });
        expect(mod).toBeDefined();
    });
});
