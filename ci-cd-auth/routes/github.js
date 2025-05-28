const express = require('express');
const axios = require('axios');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Helper function to log detailed errors
function logOAuthError(error, context = {}) {
  const timestamp = new Date().toISOString();
  const errorId = Math.random().toString(36).substring(2, 15);
  
  let errorDetails = {
    id: errorId,
    timestamp,
    context,
    message: error.message,
    stack: error.stack
  };
  
  // Add response data if available
  if (error.response) {
    errorDetails.status = error.response.status;
    errorDetails.statusText = error.response.statusText;
    errorDetails.data = error.response.data;
    errorDetails.headers = error.response.headers;
  }
  
  // Add request data if available
  if (error.config) {
    errorDetails.requestUrl = error.config.url;
    errorDetails.requestMethod = error.config.method;
    errorDetails.requestHeaders = error.config.headers;
    
    // Sanitize authorization headers for security
    if (errorDetails.requestHeaders && errorDetails.requestHeaders.Authorization) {
      errorDetails.requestHeaders.Authorization = '[REDACTED]';
    }
  }
  
  // Log to file
  const logFile = path.join(logsDir, `github-oauth-errors-${timestamp.split('T')[0]}.log`);
  fs.appendFileSync(
    logFile, 
    JSON.stringify(errorDetails, null, 2) + '\n\n',
    'utf8'
  );
  
  console.error(`GitHub OAuth Error [${errorId}]:`, error.message);
  
  return errorId;
}

// Validate environment variables
function checkRequiredEnvVars() {
  const required = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'GITHUB_REDIRECT_URI'];
  const missing = required.filter(name => !process.env[name]);
  
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    return false;
  }
  
  return true;
}

const clientID = process.env.GITHUB_CLIENT_ID;
const clientSecret = process.env.GITHUB_CLIENT_SECRET;
const redirectURI = process.env.GITHUB_REDIRECT_URI;

// Log environment variable status on startup
console.log('GitHub OAuth Configuration:');
console.log(`- Client ID: ${clientID ? 'Set' : 'MISSING'}`);
console.log(`- Client Secret: ${clientSecret ? 'Set' : 'MISSING'}`);
console.log(`- Redirect URI: ${redirectURI || 'MISSING'}`);

// In-memory state storage (for applications without session support)
// Note: This is not suitable for production with multiple server instances
const stateStore = new Map();

// Clean up expired states periodically (every 15 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of stateStore.entries()) {
    if (now > value.expiresAt) {
      stateStore.delete(key);
    }
  }
}, 15 * 60 * 1000);

// Step 1: Redirect user to GitHub for auth
router.get('/login', (req, res) => {
  if (!checkRequiredEnvVars()) {
    return res.redirect('/student/github?error=server_config');
  }
  
  // Generate a random state for CSRF protection
  const state = crypto.randomBytes(16).toString('hex');
  
  // Store state with 10-minute expiration
  // Store token in state if available
  stateStore.set(state, {
    expiresAt: Date.now() + (10 * 60 * 1000), // 10 minutes
    token: req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : null
  });
  
  const githubAuthURL = `https://github.com/login/oauth/authorize?client_id=${clientID}&redirect_uri=${redirectURI}&scope=repo&state=${state}`;
  console.log(`Redirecting to GitHub OAuth: ${githubAuthURL}`);
  res.redirect(githubAuthURL);
});

// Update the callback route in github.js
router.get('/auth/github/callback', async (req, res) => {
  const code = req.query.code;
  const state = req.query.state;
  
  // Validate state parameter to prevent CSRF
  if (!state || !stateStore.has(state)) {
    console.error("GitHub OAuth Error: Invalid or expired state parameter");
    return res.redirect('/student/github?error=invalid_state');
  }
  
  // Get stored state data and remove from store
  const stateData = stateStore.get(state);
  stateStore.delete(state);
  
  if (!code) {
    console.error("GitHub OAuth Error: Missing code parameter");
    return res.redirect('/student/github?error=missing_code');
  }

  try {
    console.log("Exchanging code for access token...");
    
    // Exchange code for access token
    const tokenResponse = await axios.post(`https://github.com/login/oauth/access_token`, {
      client_id: clientID,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectURI
    }, {
      headers: { Accept: 'application/json' }
    });

    console.log("Token response received:", JSON.stringify({
      status: tokenResponse.status,
      hasAccessToken: !!tokenResponse.data.access_token,
      hasError: !!tokenResponse.data.error
    }));

    if (tokenResponse.data.error) {
      const errorId = logOAuthError(new Error(tokenResponse.data.error_description || tokenResponse.data.error), {
        phase: 'token_exchange',
        responseData: tokenResponse.data
      });
      return res.redirect(`/student/github?error=github_error&id=${errorId}`);
    }

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) {
      const errorId = logOAuthError(new Error("No access token in response"), {
        phase: 'token_exchange',
        responseData: tokenResponse.data
      });
      return res.redirect(`/student/github?error=no_token&id=${errorId}`);
    }

    console.log("Getting user info with token...");
    
    // Get user info
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { 
        Authorization: `token ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-OAuth-App'
      }
    });

    const githubUser = userResponse.data;
    console.log(`GitHub user info retrieved: ${githubUser.login}`);
    
    // Store GitHub credentials in a cookie or localStorage
    // This is a simplified approach - in a real app, you'd want to store this securely
    // and associate it with the user's account in your database
    
    // Create a success URL with the GitHub info
    const successUrl = `/student/github?success=true&username=${encodeURIComponent(githubUser.login)}&token=${encodeURIComponent(accessToken)}`;
    
    // Redirect to the GitHub management page with the credentials
    res.redirect(successUrl);
    
  } catch (err) {
    const errorId = logOAuthError(err, {
      phase: err.config ? (err.config.url.includes('access_token') ? 'token_exchange' : 'user_info') : 'unknown'
    });
    
    console.error("GitHub OAuth Error:", err.message);
    
    // Provide more specific error information in the redirect
    let errorType = 'unknown';
    if (err.response) {
      errorType = `api_error_${err.response.status}`;
      console.error("GitHub API Error Details:", err.response.data);
    } else if (err.request) {
      errorType = 'network_error';
    }
    
    res.redirect(`/student/github?error=${errorType}&id=${errorId}`);
  }
});

// Repository management dashboard
router.get('/repos', async (req, res) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).send("No authorization token provided");
    }
    
    const token = authHeader.split(' ')[1];
    
    // Get user's repositories directly with the token
    const reposResponse = await axios.get('https://api.github.com/user/repos', {
      headers: { 
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-OAuth-App'
      }
    });

    res.json(reposResponse.data);
  } catch (err) {
    const errorId = logOAuthError(err, {
      phase: 'fetch_repositories'
    });
    console.error("GitHub Repo Error:", err.message);
    res.status(500).send(`Failed to fetch repositories (Error ID: ${errorId})`);
  }
});

// Create new repository
router.post('/repos', async (req, res) => {
  try {
    const { name, description, isPrivate } = req.body;
    
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).send("No authorization token provided");
    }
    
    const token = authHeader.split(' ')[1];

    const repoResponse = await axios.post('https://api.github.com/user/repos', {
      name,
      description,
      private: isPrivate
    }, {
      headers: { 
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-OAuth-App'
      }
    });

    res.json(repoResponse.data);
  } catch (err) {
    const errorId = logOAuthError(err, {
      phase: 'create_repository',
      repoName: req.body.name
    });
    console.error("GitHub Create Repo Error:", err.message);
    res.status(500).send(`Failed to create repository (Error ID: ${errorId})`);
  }
});

router.get('/repos/:owner/:repo/contents', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { path } = req.query;
    
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).send("No authorization token provided");
    }
    
    const token = authHeader.split(' ')[1];

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path || ''}`;
    const response = await axios.get(url, {
      headers: { 
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-OAuth-App'
      }
    });

    res.json(response.data);
  } catch (err) {
    const errorId = logOAuthError(err, {
      phase: 'fetch_repo_contents',
      owner: req.params.owner,
      repo: req.params.repo,
      path: req.query.path
    });
    console.error("GitHub Content Error:", err.message);
    res.status(500).send(`Failed to get repository contents (Error ID: ${errorId})`);
  }
});

// Add to github.js
router.put('/repos/:owner/:repo/contents/:path', async (req, res) => {
  try {
    const { owner, repo, path } = req.params;
    const { content, message, sha } = req.body;
    
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).send("No authorization token provided");
    }
    
    const token = authHeader.split(' ')[1];

    const response = await axios.put(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        message,
        content: Buffer.from(content).toString('base64'),
        sha: sha || null // sha is required for updates, null for new files
      },
      {
        headers: { 
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'GitHub-OAuth-App'
        }
      }
    );

    res.json(response.data);
  } catch (err) {
    const errorId = logOAuthError(err, {
      phase: 'update_file',
      owner: req.params.owner,
      repo: req.params.repo,
      path: req.params.path
    });
    console.error("GitHub File Update Error:", err.message);
    res.status(500).send(`Failed to update file (Error ID: ${errorId})`);
  }
});

// Add a route to check GitHub connection status
router.get('/connection-status', async (req, res) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json({ connected: false });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      // Make a test API call to verify token
      const userResponse = await axios.get('https://api.github.com/user', {
        headers: { 
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'GitHub-OAuth-App'
        }
      });
      
      // Token is valid
      res.json({
        connected: true,
        username: userResponse.data.login,
        verified: true
      });
    } catch (tokenError) {
      // Token is invalid or expired
      const errorId = logOAuthError(tokenError, {
        phase: 'verify_token'
      });
      
      console.log(`GitHub token verification failed (Error ID: ${errorId})`);
      
      res.json({
        connected: false,
        error: 'token_invalid',
        errorId
      });
    }
  } catch (err) {
    const errorId = logOAuthError(err, {
      phase: 'connection_status'
    });
    console.error("GitHub Connection Status Error:", err.message);
    res.status(500).send(`Failed to check GitHub connection status (Error ID: ${errorId})`);
  }
});

// Add a route to handle repository uploads
router.post('/upload-repo', async (req, res) => {
  try {
    const { name, description, isPrivate } = req.body;
    const zipFile = req.files.zipFile;
    
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).send("No authorization token provided");
    }
    
    const token = authHeader.split(' ')[1];

    // First create the repository
    const repoResponse = await axios.post('https://api.github.com/user/repos', {
      name,
      description,
      private: isPrivate === 'true'
    }, {
      headers: { 
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-OAuth-App'
      }
    });

    // Process and upload the zip file contents
    // This would typically involve extracting the zip and pushing files to GitHub
    // Implementation depends on your server setup and requirements

    res.json({
      success: true,
      repository: repoResponse.data
    });
  } catch (err) {
    const errorId = logOAuthError(err, {
      phase: 'upload_repository',
      repoName: req.body.name
    });
    console.error("GitHub Upload Repo Error:", err.message);
    res.status(500).send(`Failed to upload repository (Error ID: ${errorId})`);
  }
});

// Add a diagnostic endpoint to check GitHub API connectivity
router.get('/diagnostic', async (req, res) => {
  const results = {
    environment: {
      clientIdSet: !!clientID,
      clientSecretSet: !!clientSecret,
      redirectUriSet: !!redirectURI,
      redirectUriValue: redirectURI
    },
    connectivity: {}
  };
  
  try {
    // Test GitHub API connectivity
    const response = await axios.get('https://api.github.com/zen', {
      headers: {
        'User-Agent': 'GitHub-OAuth-App'
      }
    });
    
    results.connectivity.github = {
      status: 'success',
      statusCode: response.status,
      data: response.data
    };
  } catch (err) {
    results.connectivity.github = {
      status: 'error',
      message: err.message,
      code: err.code
    };
    
    if (err.response) {
      results.connectivity.github.statusCode = err.response.status;
      results.connectivity.github.data = err.response.data;
    }
  }
  
  res.json(results);
});

module.exports = router;
