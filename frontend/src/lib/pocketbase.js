import PocketBase from 'pocketbase'

const BASE_URL = 'http://127.0.0.1:8090'

const pb = new PocketBase(BASE_URL);

// const authData = await pb.collection("users").authWithPassword('test1234@mail.com', '12345678');


// console.log(pb.authStore.isValid);
// console.log(pb.authStore.token);
// console.log(pb.authStore.record.id);

// pb.authStore.clear();

export default pb;
