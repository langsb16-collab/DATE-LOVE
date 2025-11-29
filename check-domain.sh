#!/bin/bash
ACCOUNT_ID="e5dd8903a1e55abe924fd98b8636bbfe"
PROJECT_NAME="jtbit"

echo "=== jtbit 프로젝트의 커스텀 도메인 조회 ==="
curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT_NAME}/domains" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" | jq '.'
