export function errorHandler(error, request, reply) {
  if (error.name === 'ZodError') {
    console.log(`⚠️  Validation Error: ${error.message}`);
    return reply.code(400).send({
      error: 'Validation error',
      details: error.errors
    });
  }

  if (error.validation) {
    console.log(`⚠️  Validation Error: ${error.message}`);
    return reply.code(400).send({
      error: 'Validation error',
      details: error.validation
    });
  }

  if (error.statusCode && error.statusCode < 500) {
    console.log(`⚠️  Client Error (${error.statusCode}): ${error.message}`);
    return reply.code(error.statusCode).send({
      error: error.message
    });
  }

  console.error('❌ Server Error:', error);
  reply.code(500).send({
    error: 'Internal server error'
  });
}
