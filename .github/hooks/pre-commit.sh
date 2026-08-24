#!/bin/sh
# Run local checks before commit. Deployment environment changes stay explicit.
set -e
bun run lint
