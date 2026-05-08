# Changelog

## [2.6.0](https://github.com/grafana/faro-web-sdk/compare/v2.5.0...v2.6.0) (2026-05-08)


### Features

* align with new Faro spec fields (meta.os, meta.device, app.installationId, exception.fatal) ([#1997](https://github.com/grafana/faro-web-sdk/issues/1997)) ([4b369c4](https://github.com/grafana/faro-web-sdk/commit/4b369c4e8a5942ab8bd8acc8514d672904c8b77f))
* **errors:** add fingerprint attribute to exception logs ([#1914](https://github.com/grafana/faro-web-sdk/issues/1914)) ([82e90d1](https://github.com/grafana/faro-web-sdk/commit/82e90d17f66c39e53b32c6cdd31bc3ea420313a7))
* navigation instrumentation ([#1691](https://github.com/grafana/faro-web-sdk/issues/1691)) ([cbf1aa6](https://github.com/grafana/faro-web-sdk/commit/cbf1aa66dd9d35ee82196d3f08bf84e90c7008c2))
* **user-actions:** add user aciton severity ([#1418](https://github.com/grafana/faro-web-sdk/issues/1418)) ([fbb9bf2](https://github.com/grafana/faro-web-sdk/commit/fbb9bf24ad97a091ee934860f180ccc613163eac))
* **user-actions:** add user actions to API ([#1384](https://github.com/grafana/faro-web-sdk/issues/1384)) ([9db1bb7](https://github.com/grafana/faro-web-sdk/commit/9db1bb77fea2d3158ee7fcf40d8b50688cb372b5))


### Bug Fixes

* **build:** deduplicate tsBuildInfoFile paths in tsconfig.bundle.json ([#1947](https://github.com/grafana/faro-web-sdk/issues/1947)) ([92fd42a](https://github.com/grafana/faro-web-sdk/commit/92fd42a735ec3f3cb6516fa5eaa95d563cfa1862))
* circular dependency between events and userActions APIs ([#1793](https://github.com/grafana/faro-web-sdk/issues/1793)) ([8838230](https://github.com/grafana/faro-web-sdk/commit/8838230ff4c462fb8951b9e474c1025e4d39bc31))
* **core,web-sdk,react:** use monotonic clock for duration measurements ([#2016](https://github.com/grafana/faro-web-sdk/issues/2016)) ([c96c565](https://github.com/grafana/faro-web-sdk/commit/c96c565026503972eceae6c47d53fd81eaf9da75))
* **core:** provide no-op faro.api default before initializeFaro ([#2009](https://github.com/grafana/faro-web-sdk/issues/2009)) ([10c4783](https://github.com/grafana/faro-web-sdk/commit/10c478399ec9171e73c814d2f74557dc93e9287a))
* **deps:** update npm-dependencies ([#1768](https://github.com/grafana/faro-web-sdk/issues/1768)) ([5821051](https://github.com/grafana/faro-web-sdk/commit/58210511f59d09c4e51e050b77d74ef0f8884751))
* **deps:** update npm-dependencies ([#1836](https://github.com/grafana/faro-web-sdk/issues/1836)) ([307802a](https://github.com/grafana/faro-web-sdk/commit/307802ac2a44389236b7affdcb63876b029d99e5))
* **deps:** update npm-dependencies ([#1856](https://github.com/grafana/faro-web-sdk/issues/1856)) ([bbf7c29](https://github.com/grafana/faro-web-sdk/commit/bbf7c29f40cf61198af16f67798a70f1e2cccd43))
* **deps:** update npm-dependencies ([#1900](https://github.com/grafana/faro-web-sdk/issues/1900)) ([1c7fbe0](https://github.com/grafana/faro-web-sdk/commit/1c7fbe0559a4497126140598090a4d4df20313e4))
* **deps:** update npm-dependencies ([#1936](https://github.com/grafana/faro-web-sdk/issues/1936)) ([edeb578](https://github.com/grafana/faro-web-sdk/commit/edeb578a3903b9c9ca7c7aa240ab3ad38032d1f5))
* **deps:** update npm-dependencies ([#1965](https://github.com/grafana/faro-web-sdk/issues/1965)) ([25e3173](https://github.com/grafana/faro-web-sdk/commit/25e3173104f49db60d347b3a87f1bda2c43427b5))
* **deps:** update npm-dependencies ([#1994](https://github.com/grafana/faro-web-sdk/issues/1994)) ([868a5b7](https://github.com/grafana/faro-web-sdk/commit/868a5b7de1fa86b7d9e52507d4da5f95b2d10e1f))
* **deps:** update npm-dependencies ([#2019](https://github.com/grafana/faro-web-sdk/issues/2019)) ([445f385](https://github.com/grafana/faro-web-sdk/commit/445f3859b954ac2277aea361844ac5cb6615d9b0))
* **metas:** incude sdk name in meta ([#1869](https://github.com/grafana/faro-web-sdk/issues/1869)) ([f3d64a0](https://github.com/grafana/faro-web-sdk/commit/f3d64a0f216d38460bb11065fbd3e408fa878006))
* **user actions:** buffered items were dropped on cancel ([#1861](https://github.com/grafana/faro-web-sdk/issues/1861)) ([bd14888](https://github.com/grafana/faro-web-sdk/commit/bd14888a4cbec565a219aa7f6dc1e427a8047e17))
* **user actions:** do not associate events with halted user action ([#1677](https://github.com/grafana/faro-web-sdk/issues/1677)) ([f2c56c5](https://github.com/grafana/faro-web-sdk/commit/f2c56c5b651f3648faa96961d8edaed46e2a50f9))
* **user-actions:** custom severity wasn't added to user action attributes ([#1551](https://github.com/grafana/faro-web-sdk/issues/1551)) ([bac611a](https://github.com/grafana/faro-web-sdk/commit/bac611ad8f759efddaa12c67570f71ca29bac145))
