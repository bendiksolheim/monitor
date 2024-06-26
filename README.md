# monitor

![Screenshot of status page](./screenshot.png)

Every monitoring system I could find was way out of my league for a few services in a homelab environment, so I rolled my own.

Checks the status of configured services at given intervals by making a request to an endpoint and checking the response status. The status is optionally reported to a service such as https://healthchecks.io so you can receive notifications when services are down.

## Configuration

```json
{
  "services": [
    {
      "service": "vg.no",
      "schedule": "every minute",
      "url": "https://www.vg.no",
      "okStatusCode": 200
    },
    {
      "service": "nas",
      "schedule": "every minute",
      "url": "http://192.168.1.200:5000",
      "okStatusCode": 200
    },
    {
      "service": "Home Assistant",
      "schedule": "every 10 minutes",
      "url": "http://192.168.1.89:4357",
      "okStatusCode": 200
    },
    {
      "service": "Nginx",
      "schedule": "every minute",
      "url": "http://macbook-server:80",
      "okStatusCode": 301
    }
  ],
  "healthcheck": {
    "url": "https://hc-ping.com/1234567890",
    "schedule": "every 10 minutes"
  }
}
```

The `healthcheck` property is optional. Skipping it will make this tool function just as a uptime checker.

## Docker

Assuming you have saved your config in `./config/config.json`, run this command:

```sh
docker run -v ./config:/config -p 3000:3000 bendiksolheim/monitor:latest
```

See [docker-compose.yml](./docker-compose.yml) for a docker compose example.

## Development

```bash
# Create an example configuration
$ npm run create-config

# Run server
$ npm run dev
```

## Wishlist

- [] Separate page showing current configuration
- [] Separate page for altering current configuration
- [] Integragion with ntfy.sh
