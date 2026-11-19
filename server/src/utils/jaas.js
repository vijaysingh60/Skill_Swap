import jwt from 'jsonwebtoken';

/**
 * Video runs on JaaS (Jitsi as a Service, 8x8.vc). The public meet.jit.si server no longer allows
 * embedding, so each participant gets a short-lived RS256 token signed with our JaaS private key.
 * Read lazily so the server can start (and the rest of the app work) without video configured.
 */
export function getJaasConfig() {
  const appId = process.env.JAAS_APP_ID?.trim();
  const keyId = process.env.JAAS_KEY_ID?.trim();
  const privateKey = process.env.JAAS_PRIVATE_KEY?.trim();
  if (!appId || !keyId || !privateKey) return null;
  return {
    appId,
    // JaaS expects kid as "<appId>/<keyId>"; accept either form in the env var.
    kid: keyId.includes('/') ? keyId : `${appId}/${keyId}`,
    // .env files usually store the PEM on one line with literal \n.
    privateKey: privateKey.replace(/\\n/g, '\n'),
  };
}

/** Token for one participant of one room. `room` is a literal match, so it only works for this class. */
export function signRoomToken({ user, roomId, moderator, expiresAt }) {
  const { appId, kid, privateKey } = getJaasConfig();
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      aud: 'jitsi',
      iss: 'chat',
      sub: appId,
      room: roomId,
      nbf: now - 10,
      exp: Math.floor(expiresAt.getTime() / 1000),
      context: {
        // No email: the room only needs a name and moderator flag.
        user: { id: String(user._id), name: user.name, moderator: moderator ? 'true' : 'false' },
        features: { livestreaming: false, 'outbound-call': false, transcription: false, recording: false },
        room: { regex: false },
      },
    },
    privateKey,
    { algorithm: 'RS256', keyid: kid },
  );
}
