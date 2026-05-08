# Changelog

## [2.6.0](https://github.com/grafana/faro-web-sdk/compare/v2.5.0...v2.6.0) (2026-05-08)


### Features

* align with new Faro spec fields (meta.os, meta.device, app.installationId, exception.fatal) ([#1997](https://github.com/grafana/faro-web-sdk/issues/1997)) ([4b369c4](https://github.com/grafana/faro-web-sdk/commit/4b369c4e8a5942ab8bd8acc8514d672904c8b77f))
* navigation instrumentation ([#1691](https://github.com/grafana/faro-web-sdk/issues/1691)) ([cbf1aa6](https://github.com/grafana/faro-web-sdk/commit/cbf1aa66dd9d35ee82196d3f08bf84e90c7008c2))
* **transport:** support async dynamic headers in FetchTransport ([#1932](https://github.com/grafana/faro-web-sdk/issues/1932)) ([2568fd3](https://github.com/grafana/faro-web-sdk/commit/2568fd3adac5b3f2cc7e60faeb58ec9eaccc8ad2))
* **transport:** support dynamic headers in transports ([#1788](https://github.com/grafana/faro-web-sdk/issues/1788)) ([54e6527](https://github.com/grafana/faro-web-sdk/commit/54e6527da5017ef698eef7d90573b68402d690ef))
* update web-vitals to v5 ([#1386](https://github.com/grafana/faro-web-sdk/issues/1386)) ([b8103e8](https://github.com/grafana/faro-web-sdk/commit/b8103e876c4641abd92706f2abe44b3b0a9aeada))
* **user-actions:** add user actions to API ([#1384](https://github.com/grafana/faro-web-sdk/issues/1384)) ([9db1bb7](https://github.com/grafana/faro-web-sdk/commit/9db1bb77fea2d3158ee7fcf40d8b50688cb372b5))
* **web-sdk:** add `httpHost` to `faro.performance.resource` events ([#2014](https://github.com/grafana/faro-web-sdk/issues/2014)) ([517d26f](https://github.com/grafana/faro-web-sdk/commit/517d26f17f96d21990e52c5804a0b77676f685df))
* **web-sdk:** include active instrumentations in sdk meta payload ([#1972](https://github.com/grafana/faro-web-sdk/issues/1972)) ([8585a2f](https://github.com/grafana/faro-web-sdk/commit/8585a2f50d387d8dfb7b6af042bcf6ca253b6f2f))


### Bug Fixes

* **build:** deduplicate tsBuildInfoFile paths in tsconfig.bundle.json ([#1947](https://github.com/grafana/faro-web-sdk/issues/1947)) ([92fd42a](https://github.com/grafana/faro-web-sdk/commit/92fd42a735ec3f3cb6516fa5eaa95d563cfa1862))
* **ConsoleInstrumentation:** make console instrumentation work with multiple SDK instances ([#1825](https://github.com/grafana/faro-web-sdk/issues/1825)) ([61719d7](https://github.com/grafana/faro-web-sdk/commit/61719d7f8616def644fc77379036a9e84ed48f13))
* **core,web-sdk,react:** use monotonic clock for duration measurements ([#2016](https://github.com/grafana/faro-web-sdk/issues/2016)) ([c96c565](https://github.com/grafana/faro-web-sdk/commit/c96c565026503972eceae6c47d53fd81eaf9da75))
* **deps:** update npm-dependencies ([#1768](https://github.com/grafana/faro-web-sdk/issues/1768)) ([5821051](https://github.com/grafana/faro-web-sdk/commit/58210511f59d09c4e51e050b77d74ef0f8884751))
* **deps:** update npm-dependencies ([#1936](https://github.com/grafana/faro-web-sdk/issues/1936)) ([edeb578](https://github.com/grafana/faro-web-sdk/commit/edeb578a3903b9c9ca7c7aa240ab3ad38032d1f5))
* don't assume a window when testing for k6 ([#1644](https://github.com/grafana/faro-web-sdk/issues/1644)) ([b638440](https://github.com/grafana/faro-web-sdk/commit/b6384405460bc9a9fa21029d62550f6450acb231))
* **errors:** preserve error type for Error subclasses in getErrorDetails ([#1971](https://github.com/grafana/faro-web-sdk/issues/1971)) ([4f898c1](https://github.com/grafana/faro-web-sdk/commit/4f898c1c01a93d1c539ceb7f11318d609c94931f))
* **fetch-transport:** fix flaky 429 backoff tests by initializing disabledUntil to epoch ([#1988](https://github.com/grafana/faro-web-sdk/issues/1988)) ([16ee6f6](https://github.com/grafana/faro-web-sdk/commit/16ee6f6a044d42e3fa876014a91cd3df1512d53f))
* **metas:** incude sdk name in meta ([#1869](https://github.com/grafana/faro-web-sdk/issues/1869)) ([f3d64a0](https://github.com/grafana/faro-web-sdk/commit/f3d64a0f216d38460bb11065fbd3e408fa878006))
* prevent filename from being badly extracted when no function name is resolved ([#1475](https://github.com/grafana/faro-web-sdk/issues/1475)) ([8efdd77](https://github.com/grafana/faro-web-sdk/commit/8efdd7747180110708edcdc481955ba9f927e7a8))
* **session:** prevent infinite recursion in session meta sync ([#1956](https://github.com/grafana/faro-web-sdk/issues/1956)) ([ef966c2](https://github.com/grafana/faro-web-sdk/commit/ef966c21bb8db642e4ed820789d4f57047df229a))
* **user-actions:** custom severity wasn't added to user action attributes ([#1551](https://github.com/grafana/faro-web-sdk/issues/1551)) ([bac611a](https://github.com/grafana/faro-web-sdk/commit/bac611ad8f759efddaa12c67570f71ca29bac145))
* **web-sdk:** capture all CSP violation event attributes ([#1819](https://github.com/grafana/faro-web-sdk/issues/1819)) ([2d83e27](https://github.com/grafana/faro-web-sdk/commit/2d83e272bdb13b3b48414d1f493ddf4181ee2579))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @grafana/faro-core bumped from ^2.5.0 to ^2.6.0
