This is graphql server, you can explore the schema by running it and navigating to `/graphiql` 

#### Authentication flow
- User navigates to `/oauth2/authorization/github` route of the backend server
- User gets redirected to GitHub and completes authentication
- User is redirected by GitHub back to the backend, gets his JWT http-only cookie
- Backend redirects the user to `LOGIN_REDIRECT_URL` specified in environment
- On subsequent graphql requests identity of the user would be determined by JWT in his cookies
