# Manual Installation Guide for OAuth2 Frontend

**Disclaimer:** The frontend has been developed and tested within a Docker container environment on a Pterodactyl panel. While Docker-based deployments are fully supported and expected to function without issues, deployments outside of Docker are not guaranteed. Users deploying in non-Docker environments are responsible for establishing their own web server configurations (Apache or Nginx), with Nginx recommended, as the Docker container is also Nginx-based. Any issues encountered in non-Docker environments should be reported via a pull request, including a detailed description of the problem and the resolution implemented.

---

## Introduction

This document provides a detailed, formalized guide for the manual installation and configuration of the OAuth2 frontend. Users deploying within a Pterodactyl container may simply upload the `webroot` directory; however, proper operation necessitates additional configuration steps.

---

## Installation (Non-Pterodactyl Environment)

Download the `webroot` directory into `/var/www/` and establish an appropriate web server configuration for Apache or Nginx. Nginx is recommended for compatibility with the Docker-based environment.

---

## Installation (Pterodactyl Container Environment)

1. Download the Pterodactyl Egg: [LumenWeb](https://builtbybit.com/resources/lumenweb.59393/) and import it into your Pterodactyl Panel.
2. Create a new server using this egg and assign your domain.
3. Upon completion of the automated installation, follow the console prompts to configure a Cloudflare tunnel.
4. Navigate to the server files, delete the existing `webroot` directory, and replace it with the provided `webroot` folder.

---

# Configuration

## Step 1: OAuth2 Interface Configuration

1. Navigate to the OAuth2 web interface directory:

```
webroot/oauth2/
```

2. Duplicate the example environment configuration:

```
.env.example → .env
```

3. Modify the `.env` file with the following parameters:

* **API_BASE**: Replace `example.com` with your deployment domain.
* **APP_DOMAIN**: Specify your domain without the protocol (`https://`) or any additional subpaths. Example: `lennox-rose.com`.

Ensure all entries correspond precisely to your deployment environment to guarantee proper operation.

---

## Step 2: Administrative Interface Configuration

1. Navigate to the administrative interface directory:

```
webroot/admin/
```

2. Duplicate the example environment configuration:

```
.env.example → .env
```

3. Configure the `.env` file parameters as follows:

* **API_SECRET**: Provide a consistent alphanumeric string to serve as a secure authorization key for communication between the frontend, backend, and auxiliary services (e.g., a Discord bot). Consistency across all `.env` files utilizing this secret is mandatory.
* **API_BASE**: Replace `example.com` with your deployment domain.
* **ADMIN_USER_ID**: Retained for debugging purposes; specifying a Discord user ID is optional.
* **APP_DOMAIN**: Specify your domain including the protocol (`https://`) and any required subpaths.

Ensuring consistency in these configurations is essential for secure and reliable communication between all integrated services.

---

## Step 3: Updating the Frontend

To update the frontend:

1. Retain your existing `.env` configuration files.
2. Remove the current frontend deployment.
3. Upload the updated frontend files.
4. Restore the `.env` files to their original locations.

**Note:** Users deploying outside of Docker may utilize the forthcoming `update.sh` script to automate frontend updates. A custom container with integrated Cloudflare tunneling may also be provided in the future for simplified deployment and publication.

---

## Summary

This document delineates the requisite steps for manual deployment and configuration of the OAuth2 frontend. Strict adherence to environment variable specifications and consistent secret management is critical for maintaining operational integrity and security across all components.

---

## Note

We wish you Goodluck!