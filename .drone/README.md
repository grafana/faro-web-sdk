When updating the drone.yml file the file must be re-signed using `yarn drone`. This is limited to Grafana employees for security reasons.

Drone environment variables will need to be setup beforehand.

```
export DRONE_SERVER=<url>
export DRONE_TOKEN=<token>
```

These can be found at https://drone.grafana.net/account
