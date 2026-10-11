const crypto = require("crypto");
const { roles } = require("../constants/roles");
const SESSION_COOKIE = "mineos_session";
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
function parseCookies(request) { return Object.fromEntries((request.headers.cookie || "").split(";").map((item) => item.trim()).filter(Boolean).map((item) => { const separator = item.indexOf("="); return [item.slice(0, separator), decodeURIComponent(item.slice(separator + 1))]; })); }
function signSession(payload) { const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url"); const signature = crypto.createHmac("sha256", process.env.AUTH_SESSION_SECRET).update(encoded).digest("base64url"); return `${encoded}.${signature}`; }
function readSession(token) { if (!token || !process.env.AUTH_SESSION_SECRET) return null; const [encoded, signature] = token.split("."); if (!encoded || !signature) return null; const expected = crypto.createHmac("sha256", process.env.AUTH_SESSION_SECRET).update(encoded).digest("base64url"); if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null; try { const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")); return payload.expires_at > Date.now() ? payload : null; } catch (_error) { return null; } }
function sessionCookieFlags(maxAgeSeconds) { return `HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`; }
function setSessionCookie(response, session) { response.setHeader("Set-Cookie", `${SESSION_COOKIE}=${encodeURIComponent(signSession(session))}; ${sessionCookieFlags(SESSION_MAX_AGE_SECONDS)}`); }
function requireAuth(request, response, next) { const session = readSession(parseCookies(request)[SESSION_COOKIE]); if (!session) return response.status(401).json({ error: "Sign in at http://localhost:5050/login before using MineOS." }); request.user = session; return next(); }
function requireRoles(...allowed) { return (request, response, next) => allowed.includes(request.user.role) ? next() : response.status(403).json({ error: "Your role is not allowed to perform this action." }); }
function canAccessMine(request, mineId) { return request.user.role !== roles.MANAGER || Number(request.user.mine_id) === Number(mineId); }
module.exports = { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, parseCookies, setSessionCookie, sessionCookieFlags, requireAuth, requireRoles, canAccessMine };
