import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { config } from './config.js';
import { ApiError } from './errors.js';
import { ERROR_CODES } from '@canopy/config';

function sign(payload) { const body=Buffer.from(JSON.stringify(payload)).toString('base64url'); const mac=createHmac('sha256',config.auth.jwtSecret).update(body).digest('base64url'); return `${body}.${mac}`; }
export function hashPassword(password) { const salt=randomBytes(16).toString('hex'); return `${salt}:${scryptSync(password,salt,64).toString('hex')}`; }
export function verifyPassword(password, encoded) { const [salt,expected]=String(encoded||'').split(':'); if(!salt||!expected)return false; const actual=scryptSync(password,salt,64).toString('hex'); return actual.length===expected.length&&timingSafeEqual(Buffer.from(actual),Buffer.from(expected)); }
export function issueAccessToken(user) { return sign({sub:user.id,email:user.email,exp:Math.floor(Date.now()/1000)+config.auth.tokenTtlSeconds}); }
function verify(token) { const [body,mac]=String(token).split('.'); if(!body||!mac)return null; const expected=createHmac('sha256',config.auth.jwtSecret).update(body).digest('base64url'); if(mac.length!==expected.length||!timingSafeEqual(Buffer.from(mac),Buffer.from(expected)))return null; const payload=JSON.parse(Buffer.from(body,'base64url').toString('utf8')); return payload.exp>Math.floor(Date.now()/1000)?payload:null; }
export function generateApiToken() { return `cnp_pat_${randomBytes(32).toString('base64url')}`; }
export function hashApiToken(token) { return createHash('sha256').update(String(token)).digest('hex'); }
export async function authenticateRequest(request, requiredScope = null) {
  const header = request.headers.authorization || '';
  let token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token && request.query?.token) {
    token = String(request.query.token).trim();
  }
  if (!token) throw new ApiError(ERROR_CODES.UNAUTHENTICATED, 'Invalid or expired access token.', { statusCode: 401 });
  if (token.startsWith('cnp_pat_')) return authenticateApiToken(request, token, requiredScope);
  const payload=verify(token);
  if(!payload)throw new ApiError(ERROR_CODES.UNAUTHENTICATED,'Invalid or expired access token.',{statusCode:401});
  const user=(await request.server.repositories.core.pool.query('SELECT id,email FROM users WHERE id=$1',[payload.sub])).rows[0];
  if(!user)throw new ApiError(ERROR_CODES.UNAUTHENTICATED,'Invalid or expired access token.',{statusCode:401});
  return Object.freeze({kind:'user',userId:user.id,email:user.email,scopes:['*'],token});
}

async function authenticateApiToken(request, token, requiredScope) {
  const tokenHash = hashApiToken(token);
  const row = (await request.server.repositories.core.pool.query(
    `SELECT t.id,t.user_id,t.scopes,t.revoked_at,u.email
     FROM api_tokens t JOIN users u ON u.id=t.user_id
     WHERE t.token_hash=$1`,
    [tokenHash]
  )).rows[0];
  if (!row || row.revoked_at) throw new ApiError(ERROR_CODES.UNAUTHENTICATED,'Invalid or expired access token.',{statusCode:401});
  if (requiredScope && !row.scopes.includes(requiredScope)) throw new ApiError('INSUFFICIENT_SCOPE','Token scope does not allow this operation.',{statusCode:403});
  await request.server.repositories.core.pool.query('UPDATE api_tokens SET last_used_at=now() WHERE id=$1',[row.id]).catch(() => {});
  return Object.freeze({kind:'token',tokenId:row.id,userId:row.user_id,email:row.email,scopes:row.scopes,tokenPrefix:token.slice(0,16)});
}
