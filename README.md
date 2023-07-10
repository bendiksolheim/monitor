# monitor

Every monitoring system I could find was way out of my league for a few services in a homelab environment, so I rolled my own.

Checks the status of configured services at given intervals by making a request to an endpoint and checking the response status. The status is optionally reported to a service such as https://healthchecks.io so you can receive notifications when services are down.

## Configuration

```yaml
services:
  - service: vg.no
    expression: "*/10 * * * *"
    url: https://www.vg.no
    okStatusCode: 200
  - service: my-nas
    expression: "*/10 * * * *"
    url: http://192.168.1.200:5000
    okStatusCode: 200
  - service: Home Assistant
    expression: "*/10 * * * *"
    url: http://192.168.1.89:4357
    okStatusCode: 200

# This is optional. Leave out to use just as a measure of service uptime
healthcheck:
  url: "https://hc-ping.com/2901db24-a7f2-4184-9807-0118a5526ff4"
  expression: "*/10 * * * *"
```

## docker

Assuming you have saved your config in `./config/config.yaml`, run this command:

```sh
docker run -v ./config:/config -p 3000:3000 bendiksolheim/monitor:latest
```

See [docker-compose.yml](./docker-compose.yml) for a docker compose example.
