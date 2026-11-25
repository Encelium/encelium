# Encelium gateway

Sits between the Encelium app and the model server.

```
app ──(invite key)──▶ gateway ──(server key)──▶ model server (OpenAI-compatible)
```

- **Invite keys.** Each beta tester gets their own key. Only a hash is stored (`data/keys.json`), so a leaked copy of the file can't be used.
- **Fair use.** Requests per minute and per day, per key (defaults in `config.json`, or per key).
- **Prompt system.** `prompts/system-prefix.md` and `prompts/system-suffix.md` are added around the app's own system prompt on every request. Edit them any time: the next request uses the new text, with no restart. The person's own words are never changed.
- **Privacy.** One log line per request: time, key name, model, status, duration, token count. Never the content.
- **Usage.** `GET /v1/usage` tells the app how much of today's limit is used (for the "Today's energy" bar).
- **No dependencies.** Just Node 24 (it runs the TypeScript sources directly).

## Run it on a Linux VM (Docker)

```bash
# 1. Get the folder onto the VM (later: git clone), then:
cd services/gateway
cp config.example.json config.json        # set the upstream address and model here
chmod 644 config.json && chmod -R a+rX prompts   # the container (user 1000) must be able to read them
mkdir -p data && sudo chown 1000:1000 data       # ...and write here

# 2. Build and start (the model server's key stays in the environment, not in a file)
docker build -t encelium-gateway .
docker run -d --name encelium-gateway --restart unless-stopped -p 8787:8787 \
  -e GATEWAY_UPSTREAM_KEY='paste-the-model-server-key-here' \
  -v "$PWD/config.json:/app/config.json:ro,z" \
  -v "$PWD/prompts:/app/prompts:ro,z" \
  -v "$PWD/data:/app/data:Z" \
  encelium-gateway

# 3. Make an invite key (it's shown once)
docker exec encelium-gateway node src/admin.ts add "Me"

# 4. Check it
curl http://localhost:8787/health
curl -H "Authorization: Bearer enc_..." http://localhost:8787/v1/models
```

The `z`/`Z` flags let SELinux (Fedora, Rocky, CentOS) allow the container to use these files; elsewhere Docker ignores them. Without them (or with files only you can read), the gateway stops with "config.json can't be read: EACCES".

Logs: `docker logs -f encelium-gateway`. Keys: `docker exec encelium-gateway node src/admin.ts list | disable "Name" | enable "Name"`.

### Without Docker

Install Node 24, copy the folder to `/opt/encelium-gateway`, create `config.json`, put `GATEWAY_UPSTREAM_KEY=...` in `/etc/encelium-gateway.env`, then use `encelium-gateway.service` (systemd). Or just `node src/main.ts` to try it.

## Connect the app

Until the app ships with the gateway's address built in: **Settings → Advanced → Use your own model → Other (enter an address)**:

- Server address: `http://<vm-address>:8787/v1`
- Your key: the invite key
- Model: `encelium`

## Before real testers use it

- **HTTPS.** Put it behind a reverse proxy with a certificate (e.g. Caddy: `your.domain { reverse_proxy localhost:8787 }`). Over plain HTTP, invite keys travel unencrypted. Plain HTTP is only for a private test network.
- Back up `data/keys.json` (it holds only hashes, but losing it means new keys for everyone).

## Settings

`config.json` (see `config.example.json`); the environment wins over the file:

| Environment | Meaning |
|---|---|
| `GATEWAY_UPSTREAM_KEY` | The model server's key (keep it out of files) |
| `GATEWAY_UPSTREAM_URL` | The model server's address, e.g. `https://integrate.api.nvidia.com/v1` |
| `GATEWAY_UPSTREAM_MODEL` | The real model behind `encelium` |
| `PORT` | Port to listen on (default 8787) |
| `GATEWAY_CONFIG` | Path to config.json |

## Develop

```bash
npm test -w @encelium/gateway   # starts a fake model server; nothing real is called
npm start -w @encelium/gateway
```

## Native deploy (Ubuntu + systemd, no Docker)

For a small server this is lighter than Docker. Node 24 runs the TypeScript directly,
so there is nothing to build.

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash - && sudo apt install -y nodejs git
sudo git clone https://github.com/Encelium/encelium.git /opt/encelium
cd /opt/encelium/services/gateway
sudo cp config.example.json config.json   # then edit: upstreamModel = the real model id
sudo useradd -r -s /usr/sbin/nologin encelium || true
sudo mkdir -p data && sudo chown encelium:encelium data
sudo sh -c "umask 077 && cat > /etc/encelium-gateway.env"   # two lines:
#   GATEWAY_UPSTREAM_URL=https://your-model-api/v1
#   GATEWAY_UPSTREAM_KEY=the-key
sudo cp encelium-gateway.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now encelium-gateway
```

Put Caddy in front for HTTPS (`reverse_proxy 127.0.0.1:8787`) and keep `host` at
`127.0.0.1` in config.json so the gateway is never exposed directly. Keys and quotas
are managed with `node src/admin.ts …` from the gateway folder; the system prompt
lives in `prompts/system-prefix.md` and hot-reloads on the next request.
