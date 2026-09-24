const BASE = "http://localhost:4000";

async function requestRide(token, seats) {
  const res = await fetch(`${BASE}/api/rides`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ pickup: "Banani", destination: "Mohakhali", seats }),
  });
  return res.json();
}

const [tokenA, tokenB] = process.argv.slice(2);

const [resultA, resultB] = await Promise.all([
  requestRide(tokenA, 1),
  requestRide(tokenB, 1),
]);

console.log("Request A:", resultA);
console.log("Request B:", resultB);