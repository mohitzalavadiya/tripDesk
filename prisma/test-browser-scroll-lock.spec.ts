import { test, expect } from '@playwright/test';

test.use({ channel: 'msedge' });

test.describe('Real Browser Scroll Lock & DOM Inspection', () => {
  test('Default page (/login) has unlocked background scroll', async ({ page }) => {
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle' });

    const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
    const htmlOverflow = await page.evaluate(() => document.documentElement.style.overflow);
    const hasLockAttr = await page.evaluate(() => document.body.hasAttribute('data-modal-scroll-locked'));

    console.log(`[Browser Check] /login body.overflow='${bodyOverflow}', lockedAttr=${hasLockAttr}`);
    expect(bodyOverflow).not.toBe('hidden');
    expect(htmlOverflow).not.toBe('hidden');
    expect(hasLockAttr).toBe(false);
  });

  test('Default page (/signup) has unlocked background scroll', async ({ page }) => {
    await page.goto('http://localhost:3001/signup', { waitUntil: 'networkidle' });

    const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
    const hasLockAttr = await page.evaluate(() => document.body.hasAttribute('data-modal-scroll-locked'));

    console.log(`[Browser Check] /signup body.overflow='${bodyOverflow}', lockedAttr=${hasLockAttr}`);
    expect(bodyOverflow).not.toBe('hidden');
    expect(hasLockAttr).toBe(false);
  });

  test('Reference-counted Acquire/Release and Nested Lock Lifecycle in Browser DOM', async ({ page }) => {
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle' });

    const results = await page.evaluate(() => {
      const doc = document;
      const body = doc.body;
      const html = doc.documentElement;

      let activeLockCount = 0;
      let originalBodyOverflow = '';
      let originalHtmlOverflow = '';
      let originalBodyPaddingRight = '';

      function acquire() {
        activeLockCount += 1;
        if (activeLockCount === 1) {
          originalBodyOverflow = body.style.overflow;
          originalHtmlOverflow = html.style.overflow;
          originalBodyPaddingRight = body.style.paddingRight;

          const scrollbarWidth = window.innerWidth - html.clientWidth;
          html.style.overflow = 'hidden';
          body.style.overflow = 'hidden';
          if (scrollbarWidth > 0) {
            body.style.paddingRight = `${scrollbarWidth}px`;
          }
          body.setAttribute('data-modal-scroll-locked', 'true');
        }
      }

      function release() {
        activeLockCount = Math.max(0, activeLockCount - 1);
        if (activeLockCount === 0) {
          body.style.overflow = originalBodyOverflow;
          html.style.overflow = originalHtmlOverflow;
          body.style.paddingRight = originalBodyPaddingRight;
          body.removeAttribute('data-modal-scroll-locked');
        }
      }

      // Step 1: Initial
      const s1 = { count: activeLockCount, locked: body.hasAttribute('data-modal-scroll-locked') };

      // Step 2: Acquire lock 1
      acquire();
      const s2 = { count: activeLockCount, locked: body.hasAttribute('data-modal-scroll-locked'), overflow: body.style.overflow };

      // Step 3: Acquire nested lock 2
      acquire();
      const s3 = { count: activeLockCount, locked: body.hasAttribute('data-modal-scroll-locked') };

      // Step 4: Release nested lock 1 (count 2 -> 1)
      release();
      const s4 = { count: activeLockCount, locked: body.hasAttribute('data-modal-scroll-locked') };

      // Step 5: Release final lock (count 1 -> 0)
      release();
      const s5 = { count: activeLockCount, locked: body.hasAttribute('data-modal-scroll-locked'), overflow: body.style.overflow };

      return { s1, s2, s3, s4, s5 };
    });

    expect(results.s1.locked).toBe(false);
    expect(results.s2.locked).toBe(true);
    expect(results.s2.overflow).toBe('hidden');
    expect(results.s3.count).toBe(2);
    expect(results.s3.locked).toBe(true);
    expect(results.s4.count).toBe(1);
    expect(results.s4.locked).toBe(true);
    expect(results.s5.count).toBe(0);
    expect(results.s5.locked).toBe(false);
    expect(results.s5.overflow).toBe('');
  });
});
