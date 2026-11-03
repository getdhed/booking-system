// Создаёт и удаляет только собственные тестовые заявки и помещения.
import assert from 'node:assert/strict';
const base = (process.env.LAB5_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
for (const name of ['LAB5_EMAIL','LAB5_PASSWORD','LAB5_USER_EMAIL','LAB5_USER_PASSWORD']) {
  if (!process.env[name]) throw new Error('Set ' + name + ' for booking review checks');
}
async function call(path, {method='GET', token, body, status=200}={}) {
  const response = await fetch(base+path, {method, headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  const data = response.status===204?null:await response.json();
  assert.equal(response.status,status,method+' '+path+': '+JSON.stringify(data));
  return data;
}
const login = (email,password) => call('/auth/login',{method:'POST',body:{email,password}});
const rooms=[], bookings=[]; let admin;
try {
  admin=(await login(process.env.LAB5_EMAIL,process.env.LAB5_PASSWORD)).accessToken;
  const user=(await login(process.env.LAB5_USER_EMAIL,process.env.LAB5_USER_PASSWORD)).accessToken;
  const owner=await call('/profile',{token:user});
  const adminProfile=await call('/profile',{token:admin});
  assert.equal(adminProfile.role,'admin'); assert.equal(owner.role,'user');
  const preflight=await fetch(base+'/bookings/1',{method:'OPTIONS',headers:{Origin:'http://localhost:5173','Access-Control-Request-Method':'PATCH'}});
  assert.match(preflight.headers.get('Access-Control-Allow-Methods'), /PATCH/);
  for(let i=0;i<2;i++) {
    const room=await call('/rooms',{method:'POST',token:admin,status:201,body:{name:'Booking review test',roomNumber:'REV-'+Date.now()+'-'+i,location:'Test only',floor:1,capacity:i?4:12,isActive:true}});
    rooms.push(room.id);
  }
  const body={roomId:rooms[0],startTime:'2030-01-15T10:00:00Z',endTime:'2030-01-15T11:00:00Z',purpose:'Встреча команды',attendeeCount:3,status:'confirmed',userId:adminProfile.id};
  let booking=await call('/bookings',{method:'POST',token:user,body,status:201});bookings.push(booking.id);
  assert.equal(booking.status,'pending'); assert.equal(booking.userId,owner.id);
  assert.equal(booking.user.email,owner.email);
  const path='/bookings/'+booking.id;
  await call(path,{method:'PATCH',body:{status:'confirmed'},status:401});
  for(const method of ['PATCH','PUT']) await call(path,{method,token:user,body:{status:'confirmed'},status:403});
  console.log('✓ Пользователь создаёт только свою ожидающую заявку; решение доступно только админу');
  const edits={roomId:rooms[1],startTime:'2030-01-16T12:30:00Z',endTime:'2030-01-16T14:00:00Z',purpose:'Согласованная встреча',attendeeCount:4,notes:'Время согласовано по почте'};
  booking=await call(path,{method:'PATCH',token:admin,body:edits});
  assert.equal(booking.status,'pending');assert.equal(booking.roomId,rooms[1]);assert.equal(booking.userId,owner.id);
  assert.equal(new Date(booking.startTime).toISOString(),'2030-01-16T12:30:00.000Z');
  assert.equal(booking.attendeeCount,4);assert.equal(booking.notes,edits.notes);
  for(const invalid of [{attendeeCount:5},{status:'invalid'},{userId:adminProfile.id},{endTime:edits.startTime},{roomId:999999999},{notes:'x'.repeat(2001)}])
    await call(path,{method:'PATCH',token:admin,body:invalid,status:400});
  const unchanged=await call(path,{token:user});assert.equal(unchanged.attendeeCount,4);assert.equal(unchanged.status,'pending');assert.equal(unchanged.notes,edits.notes);
  console.log('✓ Изменение комнаты, времени, цели, участников и комментария; ошибочные изменения не сохраняются');
  await call(path,{method:'PATCH',token:admin,body:{status:'confirmed'}});
  assert.equal((await call(path,{token:user})).status,'confirmed');
  await call(path,{method:'PATCH',token:admin,body:{status:'completed'}});
  assert.equal((await call(path,{token:user})).status,'completed');
  booking=await call('/bookings',{method:'POST',token:user,body,status:201});bookings.push(booking.id);
  await call('/bookings/'+booking.id,{method:'PATCH',token:admin,body:{status:'rejected',notes:'Помещение занято, предложен другой день'}});
  const rejected=(await call('/bookings',{token:user})).find(item=>item.id===booking.id);
  assert.equal(rejected.status,'rejected');assert.match(rejected.notes,/другой день/);
  assert.ok((await call('/bookings',{token:admin})).some(item=>item.id===booking.id));
  console.log('✓ Одобрение, отклонение, завершение; пользователь видит решение и комментарий');
  await call('/rooms/'+rooms[1],{method:'PUT',token:admin,body:{name:'Unavailable review test',roomNumber:'OFF-'+Date.now(),location:'Test',floor:1,capacity:4,isActive:false}});
  await call('/bookings/'+booking.id,{method:'PATCH',token:admin,body:{roomId:rooms[1],status:'confirmed'},status:400});
  console.log('✓ Нельзя одобрить заявку на недоступное помещение');
  console.log('Booking review integration checks passed.');
} finally {
  if(admin) {
    for(const id of bookings) await call('/bookings/'+id,{method:'DELETE',token:admin,status:204});
    for(const id of rooms) await call('/rooms/'+id,{method:'DELETE',token:admin,status:204});
  }
}
