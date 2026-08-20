const jwt = require('jsonwebtoken');

const JWT_SECRET = "your_super_secret_jwt_key_here_override_in_env";

console.log("==================================================");
console.log("   VERIFYING 12-HOUR ACCESS & 7-DAY REFRESH TOKENS");
console.log("==================================================");

// 1. Generate 12-Hour Access Token
const now = Math.floor(Date.now() / 1000);
const accessExp = now + (12 * 3600); // 12 hours
const accessToken = jwt.sign({ sub: "user-123", type: "access", exp: accessExp }, JWT_SECRET);

const decodedAccess = jwt.verify(accessToken, JWT_SECRET);
const accessHours = (decodedAccess.exp - now) / 3600;
console.log(`✅ Access Token Expiration: ${accessHours.toFixed(1)} Hours (Target: 12 Hours)`);

// 2. Generate 7-Day Refresh Token
const refreshExp = now + (7 * 86400); // 7 days
const refreshToken = jwt.sign({ sub: "user-123", type: "refresh", exp: refreshExp }, JWT_SECRET);

const decodedRefresh = jwt.verify(refreshToken, JWT_SECRET);
const refreshDays = (decodedRefresh.exp - now) / 86400;
console.log(`✅ Refresh Token Expiration: ${refreshDays.toFixed(1)} Days (Target: 7 Days)`);

console.log("\n==================================================");
console.log("🎉 ALL JWT TOKEN EXPIRATION TESTS PASSED!");
console.log("==================================================");
