# Cloudflare tunnel ingress for pages.tyflix.net

`bootstrap.sh` adds this rule automatically. For reference / manual fix-up:

On the **infra** host (where cloudflared lives), edit `/etc/cloudflared/config.yml`:

```yaml
ingress:
  # ... existing rules above ...
  - hostname: pages.tyflix.net
    service: http://192.168.1.92:3035
  - service: http_status:404
```

Then:

```bash
sudo cloudflared tunnel ingress validate
sudo systemctl restart cloudflared
```

DNS: a CNAME from `pages.tyflix.net` → `<TUNNEL_ID>.cfargotunnel.com` (proxied). Bootstrap's CF API call handles this idempotently when `CF_API_TOKEN` / `CF_ZONE_ID` / `CF_TUNNEL_ID` are present in `~/homelab/.env`.
