import { chromium } from 'playwright';
import { createStaticServer } from '../server.mjs';
import assert from 'node:assert/strict';

const server = createStaticServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({headless: true});
try {
  for (const width of [320, 390, 760, 1024, 1440]) {
    const page = await browser.newPage({viewport: {width, height: 844}});
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.locator('#guide-start').click();
    const data = await page.evaluate(() => {
      const rect = selector => { const r=document.querySelector(selector).getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}; };
      return {rail:rect('.rail'), mark:rect('.brand-mark'), first:rect('.nav-item'), second:rect('.nav-item:nth-child(2)'), icon:rect('.nav-icon svg'), overflow:document.documentElement.scrollWidth-innerWidth};
    });
    console.log(JSON.stringify({width, ...data}));
    if (width <= 760) {
      assert.ok(data.first.y - data.mark.bottom >= 12, `At ${width}px the logo and navigation overlap or touch`);
      assert.ok(Math.abs((data.mark.x + data.mark.width/2) - (data.first.x + data.first.width/2)) <= 1, `At ${width}px the logo and navigation are not centered`);
      assert.ok(data.first.x >= data.rail.x && data.first.right <= data.rail.right, `Navigation leaves the rail at ${width}px`);
    }
    assert.ok(data.overflow <= 0, `Horizontal overflow at ${width}px`);
    if (width === 390 && process.env.SHOP_OPS_RAIL_PREVIEW) {
      await page.screenshot({path: process.env.SHOP_OPS_RAIL_PREVIEW});
    }
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
