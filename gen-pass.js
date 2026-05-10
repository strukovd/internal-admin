const msg = new TextEncoder().encode("admin");
const res = await crypto.subtle.digest("SHA-256", msg);

// Превращаем ArrayBuffer в массив байтов и каждый байт в Hex
const hashArray = Array.from(new Uint8Array(res));
const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

console.log(hashHex); 
// Результат для "admin": 8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918
