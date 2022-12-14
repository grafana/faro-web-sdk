# Metas

Metas (aka metadata) can be seen as labels or. They are additional data that accompany the errors, events etc. in order
to provide context and allow granular filtering.

## Description

### Client

Faro requires `app` meta as the only mandatory meta when initializing the library. Besides `app`, it automatically
creates a `session` meta which can also be set manually in some cases (i.e. sharing the same session with the API,
storing the session ID etc.).

Another meta which is set dynamically is the `user` meta. This contains one or more of the following: user name, user
email and/or user ID.

The session and user metas can be used to look for all the data captured from a specific session or user and both can be
combined to track the activity of a user prior to logging in.

### API

Metas in the API are similar to the ones provided by Faro but they are required by OpenTelemetry.

## Testing Scenario

- Navigate to the [Homepage][demo-homepage]
- Get the session ID from the top of the page
- Navigate to the [Features Page][demo-features-page]
- Click on the `Start new session` button from the `Events` category
- Perform other operations in the app
- Observe and get the new session ID

## Visualizing the Data

- Navigate to the [Explore page in Grafana][demo-grafana-explore]
- Select the `Cortex` or `Loki` as a datasource
- Input the session IDs copied previously into the label filters or line filters

## Screenshots

[<img src="../assets/instrumentations/metasViewApp.png" alt="Viewing metas in the app" height="100" />][assets-meta-view-app]
[<img src="../assets/instrumentations/metasViewExploreSession.png" alt="Viewing metas in Explore" height="100" />][assets-meta-view-explore-session]
[<img src="../assets/instrumentations/metasViewExploreUser.png" alt="Viewing metas in Explore" height="100" />][assets-meta-view-explore-user]

[demo-features-page]: http://localhost:5173/features
[demo-grafana-explore]: http://localhost:3000/explore
[demo-homepage]: http://localhost:5173/
[assets-meta-view-app]: ../assets/instrumentations/metasViewApp.png
[assets-meta-view-explore-session]: ../assets/instrumentations/metasViewExploreSession.png
[assets-meta-view-explore-user]: ../assets/instrumentations/metasViewExploreUser.png
