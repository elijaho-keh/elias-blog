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

// Reads a JSON request body. Only Content-Type: application/json is accepted,
// which an ordinary HTML form on another website can't send. Returns null
// (after answering with an error) if the body is missing or isn't JSON.
export function readJsonBody(req, res) {
  const type = req.headers['content-type'] || '';
  if (!type.includes('application/json')) {
    res.status(415).json({ error: 'Send the data as JSON.' });
    return null;
  }

  let body;
  try {
    body = req.body;
  } catch {
    body = null;
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    res.status(400).json({ error: 'The request body is missing or is not valid JSON.' });
    return null;
  }
  return body;
}

// Logs the real error on the server, but only sends a general message to the
// browser, so database details never leak to visitors.
export function serverError(res, error) {
  console.error(error);
  res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
}
