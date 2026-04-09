/**
 * middlewares/validate.js
 *
 * Generic Zod validation middleware factory.
 * Usage:
 *   const { validate } = require('../middlewares/validate');
 *   const { LoginSchema } = require('../validators/auth.validator');
 *   router.post('/login', validate(LoginSchema), authController.login);
 *
 * On failure it returns a structured 400 with field-level errors.
 * On success it replaces req.body with the parsed (type-coerced, stripped) value.
 */

const { ZodError } = require('zod');

/**
 * @param {import('zod').ZodSchema} schema - Zod schema to validate req.body against
 * @param {'body'|'query'|'params'} [source='body'] - Which part of the request to validate
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = (result.error.issues ?? result.error.errors ?? []).map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    // Replace with parsed & stripped data (removes unknown keys, applies defaults)
    req[source] = result.data;
    next();
  };
}

module.exports = { validate };
