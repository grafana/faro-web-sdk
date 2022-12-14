# Errors

All apps will eventually throw errors that will be captured by developers in `try/catch` blocks and handled accordingly
or sometimes they will occur without being handled.

## Description

### Client

In the case of errors (i.e. HTTP calls that return `4xx` or `5xx` status codes), we wrap the call in a `try/catch` block
for `async/await` operations or using `then` and `catch` for promises and use the `pushError` API provided by Grafana
JavaScript Agent to report them.

The Faro Errors Instrumentation automatically captures uncaught errors. It is listening to the `onerror` and
`onunhandledrejection`, then it parses the events in order to extract the stacktrace and finally they are reported.

**The captured errors are stored in Loki.**

### API

The errors that are captured server side are reported manually by writing them to a file which is then read by the
[Grafana Agent][grafana-agent].

**The captured errors are stored in Loki.**

**Given the way how the API reports the errors, they can't be filtered by `kind=exception` since they will appear as
logs.**

## Testing Scenario

- Manually instrumented requests returning an error
  - Navigate to the [Seed page][demo-seed-page]
  - Try to run the seed process at least twice (it won't work second or third time)
- Manually trigger an error
  - Navigate to the [Features page][demo-features-page]
  - Click the buttons from the `Error Instrumentation` category
- Capturing a React error
  - Navigate to the [Features page][demo-features-page]
  - Click the `Increment` button from the `Error Boundary` category 3 times

## Visualizing the Data

- **Explore page**
  - Navigate to the [Explore page in Grafana][demo-grafana-explore]
  - Select the `Loki` datasource
  - To properly view the stacktrace, click on `Escape newlines` in Grafana, above the logs
- **Dashboard**
  - Navigate to the [Frontend dashboard in Grafana][demo-grafana-frontend-dashboard]
  - Check the `Exceptions` category

## Screenshots

[<img src="../assets/instrumentations/errorsViewExplore.png" alt="Viewing errors in Explore" height="100" />][assets-errors-view-explore]
[<img src="../assets/instrumentations/errorsViewDashboard.png" alt="Viewing errors in Dashboard" height="100" />][assets-errors-view-dashboard]

[demo-features-page]: http://localhost:5173/features
[demo-grafana-explore]: http://localhost:3000/explore
[demo-grafana-frontend-dashboard]: http://localhost:3000/dashboards?query=Frontend
[demo-seed-page]: http://localhost:5173/seed
[grafana-agent]: https://github.com/grafana/agent
[assets-errors-view-dashboard]: ../assets/instrumentations/errorsViewDashboard.png
[assets-errors-view-explore]: ../assets/instrumentations/errorsViewExplore.png
