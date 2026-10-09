/**
 * The token on the current scene that a user controls with its gamepad: the token of the character of that user.
 */
export function findUserToken(userId: string): any | undefined {
  const character = game.users.get(userId)?.character;
  if (!character || !canvas?.ready) {
    return undefined;
  }
  const tokens: any[] = canvas.tokens.placeables;
  return (
    tokens.find((token) => token.actor?.uuid === character.uuid) ??
    tokens.find((token) => token.actor?.id === character.id)
  );
}
