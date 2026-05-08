# Changelog

## [2.6.0](https://github.com/grafana/faro-web-sdk/compare/v2.5.0...v2.6.0) (2026-05-08)


### Features

* **instrumentation-replay:** add experimental replay support ([#1417](https://github.com/grafana/faro-web-sdk/issues/1417)) ([29d090c](https://github.com/grafana/faro-web-sdk/commit/29d090c639bac267f161f908bd54ec4e6f17e65e))
* **instrumentation-replay:** add maskInputFn option for custom input masking ([#1896](https://github.com/grafana/faro-web-sdk/issues/1896)) ([0111756](https://github.com/grafana/faro-web-sdk/commit/0111756f639aa0f7bc56cac698ed1a31eff71196))
* **instrumentation-replay:** make recording conditional on session sampling ([#1876](https://github.com/grafana/faro-web-sdk/issues/1876)) ([59f2629](https://github.com/grafana/faro-web-sdk/commit/59f26295a80493d9ac2bcf1853d0e560920a55a2))
* **instrumentation-replay:** support `recordAfter` option in `@grafana/faro-instrumentation-replay` ([#1886](https://github.com/grafana/faro-web-sdk/issues/1886)) ([4488022](https://github.com/grafana/faro-web-sdk/commit/448802267562e48ebf721c75ec89635b1c273883))
* **replay:** add samplingRate sub-sampling option ([#1919](https://github.com/grafana/faro-web-sdk/issues/1919)) ([05dd580](https://github.com/grafana/faro-web-sdk/commit/05dd580a97dd73367fd73ef0da4da684fc981e37))
* **replay:** adopt privacy-first default masking ([#1926](https://github.com/grafana/faro-web-sdk/issues/1926)) ([5d1179c](https://github.com/grafana/faro-web-sdk/commit/5d1179cdc92f5a8c82f445724e66cfc4a123c447))
* **replay:** emit faro.session_recording.started event on recording start ([#1925](https://github.com/grafana/faro-web-sdk/issues/1925)) ([e5f7659](https://github.com/grafana/faro-web-sdk/commit/e5f7659fea93ce15e22a8cb7ec899635f9d77e25))
* **replay:** pause recording after user inactivity ([#2015](https://github.com/grafana/faro-web-sdk/issues/2015)) ([fedbe7f](https://github.com/grafana/faro-web-sdk/commit/fedbe7ff41c592a7782737ea2200680cf8796800))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @grafana/faro-core bumped from ^2.5.0 to ^2.6.0
