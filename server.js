/**
 * AI DISCLAIMER:
 * This code includes function-level comments generated with the assistance of ChatGPT.
 * ChatGPT was used to identify and explain bugs in code durring debugging process.
 */
const http = require('http');
const url = require('url');
const messages = require('./lang/en/en.js');
const Utility = require('./modules/utils.js');
const GET = 'GET';
const POST = 'POST';
const OPTIONS = 'OPTIONS';

class ServerHandler {
  constructor(server) {
    this.util = new Utility();
    this.server = server;
  }

  /**
 * Handles the storage of a new word definition.
 * 
 * - Reads the incoming JSON request body.
 * - Validates the presence of required fields ('word' and 'definition').
 * - Ensures the word contains only alphabetic characters.
 * - Checks if the word already exists; if not, stores it.
 * - Sends appropriate success or error responses.
 * 
 * @param {http.IncomingMessage} req - The HTTP request object.
 * @param {http.ServerResponse} res - The HTTP response object.
 */
  handlePostWord(req, res) {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (!data.word || !data.definition) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          return res.end(
            JSON.stringify({
              error: "Both 'word' and 'definition' fields are required."
            })
          );
        }

        // Trim and standardize input
        const word = data.word.trim().toLowerCase();
        const definition = data.definition.trim();

        // Validate that the word contains only letters and is not empty.
        const validWordPattern = /^[a-zA-Z]+$/;
        if (!word || !validWordPattern.test(word)) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          return res.end(
            JSON.stringify({
              error: "Invalid input. Word must contain only letters and must not be empty."
            })
          );
        }
        if (!definition) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          return res.end(
            JSON.stringify({
              error: "Invalid input. Definition must not be empty."
            })
          );
        }

        // Process the request
        if (!this.util.wordExists(word)) {
          this.util.addWord(word, definition);
          res.statusCode = 201;
          res.setHeader('Content-Type', 'text/plain');

          const message = `${messages.entry}\n${messages.success
            .replace('%1', this.server.requestCount)
            .replace('%2', this.util.getDate())
            .replace('%3', this.util.getTotalWords())}`;
          res.end(message);
        } else {
          res.statusCode = 409;
          res.setHeader('Content-Type', 'text/plain');
          res.end(messages.duplicate);
        }
      } catch (err) {
        console.error('JSON parsing error:', err);
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: messages.json }));
      }
    });
  }
  

/**
 * Retrieves the definition of a given word.
 * 
 * - Parses query parameters from the request URL.
 * - Validates the presence of the 'word' parameter.
 * - Checks if the word exists in storage.
 * - Returns the word's definition or an error message if not found.
 * 
 * @param {http.IncomingMessage} req - The HTTP request object.
 * @param {http.ServerResponse} res - The HTTP response object.
 */
  handleGetWord(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const query = parsedUrl.query;
    if (!query.word || query.word.trim() === '') {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(
        JSON.stringify({ error: "Invalid query. 'word' parameter is required." })
      );
    }

    const word = query.word.trim().toLowerCase();
    if (this.util.wordExists(word)) {
      const definition = this.util.getDefinition(word);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ word: word, definition: definition }));
    } else {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: messages.error }));
    }
  }

  /**
   * Handles 404 Not Found responses.
   */
  handleNotFound(req, res) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end(messages.four);
  }
}

class Server {
/**
 * Initializes and configures the server.
 * 
 * - Creates an HTTP server.
 * - Initializes request routing logic.
 * - Keeps track of request count.
 * 
 * @param {number} port - The port number for the server.
 */
  constructor(port) {
    this.port = port;
    this.server = http.createServer(this.requestHandler.bind(this));
    this.serverHandler = new ServerHandler(this);
    this.requestCount = 0;
  }

/**
 * Handles incoming HTTP requests and routes them to appropriate handlers.
 * 
 * - Parses the request URL and method.
 * - Sets CORS headers to allow cross-origin requests.
 * - Routes:
 *   - `/api/definitions` (GET): Fetch a word's definition.
 *   - `/api/definitions` (POST): Store a new word definition.
 *   - `/` (root): Returns a welcome message.
 *   - Unknown routes return a 404 response.
 * - Handles errors gracefully and ensures proper HTTP responses.
 * 
 * @param {http.IncomingMessage} req - The HTTP request object.
 * @param {http.ServerResponse} res - The HTTP response object.
 */
  requestHandler(req, res) {
    this.requestCount++;
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', `${GET}, ${POST}, ${OPTIONS}`);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === OPTIONS) {
      res.writeHead(204);
      res.end();
      return;
    }

    if (pathname === '/') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ message: 'Welcome to the API!' }));
      return;
    }

    if (pathname === '/api/definitions') {
      if (req.method === GET) {
        try {
          this.serverHandler.handleGetWord(req, res);
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/plain');
          res.end(JSON.stringify(messages.internal));
        }
      } else if (req.method === POST) {
        try {
          this.serverHandler.handlePostWord(req, res);
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/plain');
          res.end(JSON.stringify(messages.internal));
        }
      } else {
        res.statusCode = 405;
        res.setHeader('Allow', 'GET, POST');
        res.end();
      }
    } else {
      this.serverHandler.handleNotFound(req, res);
    }
  }

  /**
   * Starts the server and begins listening on the specified port.
   */
  start() {
    this.server.listen(this.port, () => {
      console.log(`Server listening on port ${this.port}`);
    });
  }
}

const port = process.env.PORT || 4040;
const myServer = new Server(port);
myServer.start();
