// Small helpers shared by the serverless functions in /api.

// Ends the request with 405 if the HTTP method isn't one this function handles.
// Returns true when the method is allowed, so a handler can do:
//   if (!allowMethods(req, res, ['GET'])) return;
export function allowMethods(req, res, methods) {
  if (methods.includes(req.method)) return true;

  res.setHeader('Allow', methods.join(', '));
  res.status(405).json({ error: `Method ${req.method} not allowed` });
  return false;
}

// Logs the real error on the server, but only sends a general message to the
// browser, so database details never leak to visitors.
export function serverError(res, error) {
  console.error(error);
  res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
}
