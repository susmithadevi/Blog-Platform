INKSPACE - BLOG PLATFORM WITH COMMENTS
======================================

FEATURES
- User registration and login
- Password hashing
- Token-based authentication
- Create, view, edit and delete blog posts
- Comment on posts
- REST API backend
- Persistent JSON-file database (data.json)
- Responsive design

REQUIREMENTS
1. Install Node.js (LTS version) from https://nodejs.org/
2. Internet connection for the first dependency installation.

HOW TO RUN ON WINDOWS
1. Extract the ZIP file.
2. Open the extracted BlogPlatform folder.
3. Click the folder address bar, type cmd and press Enter.
4. Run: npm install
5. After installation, run: npm start
6. Open this address in Chrome: http://localhost:3000

IMPORTANT
- Keep the command prompt window open while using the website.
- The first time you run the project, npm install downloads the required packages.
- Your users, posts and comments are saved in data.json in this project folder.
- Do not delete data.json if you want to keep your saved content.
- This is a beginner-friendly local demo using a JSON-file database. For production deployment,
  use a proper database such as MySQL/PostgreSQL, HTTPS, environment-based secrets and
  additional security validation.
- Change the JWT secret in server.js before any public deployment.

REST API ENDPOINTS
POST   /api/register
POST   /api/login
GET    /api/posts
POST   /api/posts                 (login required)
PUT    /api/posts/:id             (post owner only)
DELETE /api/posts/:id             (post owner only)
POST   /api/posts/:id/comments    (login required)
GET    /api/me                    (login required)

PROJECT STRUCTURE
BlogPlatform/
  server.js
  package.json
  data.json       (created automatically when the server starts)
  README.txt
  public/
    index.html
    style.css
    app.js
