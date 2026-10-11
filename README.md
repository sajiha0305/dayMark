# Daymark

Daymark is an Angular budget and hobby tracker backed by a Spring Boot API and PostgreSQL. Accounts use unique, case-normalized usernames, BCrypt password hashes, server-side sessions, and CSRF protection. Tracker data is stored per account in PostgreSQL.

## Run locally

Requirements: Java 17+, Maven 3.9+, Node.js 24.15+ (or 22.22.3+), npm, and Docker Desktop.

1. Start PostgreSQL:

	```powershell
	docker compose up -d
	```

2. Start the API from the `backend` directory:

	```powershell
	mvn spring-boot:run
	```

3. In a second terminal, start Angular from the repository root:

	```powershell
	npm start
	```

4. Open `http://localhost:4200`, create a username and password, then sign in. New usernames are case-insensitive and may contain letters, numbers, periods, underscores, and hyphens (3–30 characters). Existing accounts can still sign in with their email address as their username.

PostgreSQL is available at `localhost:5432`. The local database uses `daymark` / `daymark_dev`; do not reuse these development credentials in a hosted environment.

## Tests and builds

Run the API integration tests with H2 (Docker is not required):

```powershell
mvn -f backend/pom.xml test
```

Build the Angular site for Cloudflare Pages:

```powershell
npm run build:cloudflare
```

The deployment artifact is `dist/angular-course/browser`.

## Data import

The first verified sign-in offers a one-time import from this browser's previous `daymark-tracker` local-storage record. If the data is on another origin (for example the former GitHub Pages URL), use **Download a backup** on that origin, then choose the JSON file from the signed-in Daymark screen.

## Hosting

Cloudflare Pages serves the static Angular frontend. Its Pages Function forwards same-origin `/api/*` requests to the Spring API configured by the `API_ORIGIN` environment variable. The API needs a hosted PostgreSQL database. Set `SPRING_PROFILES_ACTIVE=prod`, `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, and `APP_COOKIE_SECURE=true` on the API host.

### Free deployment setup

The API is configured as a Render Blueprint in `render.yaml`, and `backend/Dockerfile` builds the Spring Boot service. The free Render web service sleeps after 15 minutes without traffic, so the first request after a quiet period can take about a minute. Neon Free is the database option for a small demo: it has a 1 GB storage limit per project and 100 compute-hours per month; compute suspends while idle. These limits can change, so check the provider dashboards before relying on this for important user data.

1. Create a Neon Postgres project and copy its connection details. Set Render's `DATABASE_URL` to the JDBC form `jdbc:postgresql://<host>/<database>?sslmode=require` (use the hostname and database from Neon), and set the username and password separately.
2. In Render, create a Blueprint from this repository and branch. Configure the three database variables when prompted. Render builds the API from `backend/Dockerfile` and exposes its public `onrender.com` URL.
3. In Cloudflare Pages, connect this repository and set the build command to `npm ci && npm run build:cloudflare`, with output directory `dist/angular-course/browser`. Add the `API_ORIGIN` Pages variable with the Render API origin, such as `https://daymark-api.onrender.com` (no trailing path).
4. Deploy the Pages site and verify registration and sign-in on its HTTPS URL. The same-origin Pages Function proxies API calls and session cookies.

Cloudflare Pages and Render require accounts and authorization to connect the Git repository. No provider credentials are stored in this project; the deployment files are ready for the account connection and secret entry in those dashboards.
