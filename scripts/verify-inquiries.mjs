// Smoke test the built server without contacting external services.
import assert from 'node:assert/strict';
import app from '../.output/server/index.mjs';
async function page(path, depth=0){
 const r=await app.fetch(new Request('http://localhost'+path),{},{waitUntil(){},passThroughOnException(){}});
 if([301,302,307,308].includes(r.status)){assert(depth<3);const u=new URL(r.headers.get('location'),'http://localhost');assert.equal(u.origin,'http://localhost');return page(u.pathname+u.search,depth+1);}
 assert.equal(r.status,200,path);return r.text();
}
for(const path of ['/','/catalog','/quality','/ambassador','/contact?product=ss-31&intent=coa','/partner/login','/partner/reset','/partner/dashboard','/admin/partners']){
 const html=await page(path);assert(html.includes('<html'));assert(!html.includes('Internal Server Error'));console.log('PASS',path);
}
const product=await page('/product/ss-31');assert(product.includes('intent=coa'));assert(product.includes('vial-ss31'));
console.log('PASS: product COA destination and branded image.');
