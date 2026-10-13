/**
 * Error thrown when OAuth authorization is required.
 */
export class AuthRequiredError extends Error {
  constructor(public readonly authorizationUrl: string) {
    super("Authorization required");
    this.name = "AuthRequiredError";
  }
}
