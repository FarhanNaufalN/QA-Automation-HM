import { test } from '../../fixtures/project.fixture';

/**
 * Universal Smoke — Approval workflow
 */
test.describe('Smoke | Approval', () => {
  test.beforeEach(async ({ authenticatedPage }) => {});

  test.skip('should submit and approve document', async ({ approval }) => {
    await approval.submit();
    await approval.approve();
    await approval.expectApprovalStatus(/approved|disetujui/i);
  });
});
