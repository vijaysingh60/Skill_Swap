// Error carrying an HTTP status, optional per-field messages, and optional extra JSON fields.
export class HttpError extends Error {
  constructor(status, message, fields, extra) {
    super(message);
    this.status = status;
    this.fields = fields;
    this.extra = extra;
  }
}
