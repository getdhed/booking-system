import assert from 'node:assert/strict';
import { readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
const base = (process.env.LAB5_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
if (!process.env.LAB5_EMAIL || !process.env.LAB5_PASSWORD) throw new Error('Set LAB5_EMAIL and LAB5_PASSWORD');
async function call(route, { method = 'GET', body, token, status = 200 } = {}) {
  const form = body instanceof FormData;
  const response = await fetch(base + route, {
    method, headers: { ...(body && !form ? {'Content-Type':'application/json'} : {}), ...(token ? {Authorization:'Bearer ' + token} : {}) },
    body: body ? (form ? body : JSON.stringify(body)) : undefined
  });
  const data = response.status === 204 ? null : await response.json();
  assert.equal(response.status, status, method + ' ' + route + ': ' + JSON.stringify(data));
  return data;
}
function photosForm(files) {
  const form = new FormData();
  files.forEach(([bytes, name, type]) => form.append('photos', new Blob([bytes], {type}), name));
  return form;
}
let roomId, adminToken;
const uploaded = [];
try {
  await call('/rooms/photos', { method:'POST', status:401 });
  adminToken = (await call('/auth/login', {method:'POST',body:{email:process.env.LAB5_EMAIL,password:process.env.LAB5_PASSWORD}})).accessToken;
  const catalog = await call('/rooms/amenities', {token:adminToken});
  const wifi = catalog.find(item => item.code === 'wifi'), board = catalog.find(item => item.code === 'board'), projector = catalog.find(item => item.code === 'projector');
  assert.ok(wifi && board && projector);
  await call('/rooms/photos', {method:'POST',token:adminToken,body:photosForm([[Buffer.from('not an image'),'fake.jpg','image/jpeg']]),status:400});
  await call('/rooms/photos', {method:'POST',token:adminToken,body:photosForm([[Buffer.alloc(5*1024*1024+1),'huge.jpg','image/jpeg']]),status:413});
  if (process.env.LAB5_USER_EMAIL && process.env.LAB5_USER_PASSWORD) {
    const userToken = (await call('/auth/login',{method:'POST',body:{email:process.env.LAB5_USER_EMAIL,password:process.env.LAB5_USER_PASSWORD}})).accessToken;
    await call('/rooms/photos',{method:'POST',token:userToken,status:403});
  }
  const first = await readFile(new URL('../client/public/rooms/workspace.jpg', import.meta.url));
  const second = await readFile(new URL('../client/public/rooms/conference-room.jpg', import.meta.url));
  const result = await call('/rooms/photos',{method:'POST',token:adminToken,body:photosForm([[first,'room-one.jpg','image/jpeg'],[second,'room-two.jpg','image/jpeg']]),status:201});
  assert.equal(result.photos.length,2);
  uploaded.push(...result.photos);
  assert.notEqual(uploaded[0],uploaded[1]);
  for (const [index, url] of uploaded.entries()) {
    assert.match(url,/^\/uploads\/rooms\/[0-9a-f-]{36}\.jpg$/);
    const response = await fetch(base+url);
    assert.equal(response.status,200);
    assert.equal(response.headers.get('x-content-type-options'),'nosniff');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),index ? second : first);
  }
  const data = {name:'Upload test',roomNumber:'UP-'+Date.now(),location:'Test',floor:1,capacity:8,description:'Disposable upload test',isActive:true,imageUrl:uploaded[0],galleryUrls:[uploaded[1]],amenityIds:[wifi.id,board.id]};
  const created = await call('/rooms',{method:'POST',token:adminToken,body:data,status:201});roomId=created.id;
  assert.deepEqual([...created.amenityIds].sort(),[wifi.id,board.id].sort());
  assert.equal(created.imageUrl,uploaded[0]);
  const updated = await call('/rooms/'+roomId,{method:'PUT',token:adminToken,body:{...data,imageUrl:uploaded[1],galleryUrls:[uploaded[0]],amenityIds:[projector.id]}});
  assert.deepEqual(updated.amenityIds,[projector.id]);
  assert.deepEqual(updated.amenities,[projector.label]);
  const fetched = await call('/rooms/'+roomId,{token:adminToken});
  assert.equal(fetched.imageUrl,uploaded[1]);assert.deepEqual(fetched.galleryUrls,[uploaded[0]]);
  await call('/rooms/'+roomId,{method:'PUT',token:adminToken,body:{...data,amenityIds:[999999]},status:400});
  assert.deepEqual((await call('/rooms/'+roomId,{token:adminToken})).amenityIds,[projector.id]);
  console.log('PASS: real multipart upload, stored photo bytes, limits, auth, amenity catalog and persisted selections, main-photo order');
} finally {
  if(roomId && adminToken) await call('/rooms/'+roomId,{method:'DELETE',token:adminToken,status:204});
  if(process.env.LAB5_UPLOAD_DIR) {
    for(const url of uploaded) if(/^\/uploads\/rooms\/[0-9a-f-]{36}\.jpg$/.test(url)) await unlink(path.join(process.env.LAB5_UPLOAD_DIR,path.basename(url))).catch(()=>{});
  }
}
