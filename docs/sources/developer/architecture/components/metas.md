# Metas

Metas are key-value properties that are sent with each payload.

Metas can be either:

- static - once defined, they do not change across a session
- dynamic - either computed automatically for each payload or they are changed programmatically by the end-user

## Available Metas

### App

The `app` meta ties signals with a specific app and it should not be changed across a session. It is required during
initialization and it is the responsability of the end-user to define it.

Properties:

- `name` - the name of the app
- `version` - the version of the app
- `release` - a release identifier for the app, like a commit hash, a build number or a Docker container tag
- `environment` - the environment where the app is running, like `staging` or `production`

### Browser

The `browser` meta helps with identifying the environment where the app is running and it should not change across a
session. Altough it is not handled automatically by the core package, nor is it the responsability of the end-user to
define it. Wrapper packages like `web-sdk` should handle it.

Properties:

- `name` - the name of the browser
- `version` - the version of the browser
- `os` - the operating system name and version where the browser is running
- `mobile` - a flag indication if the browser is running on a mobile device

### Page

The `page` meta helps developers identify the page where a specific signal is coming from. It changes automatically
across a session and even though it is not handled automatically by the core package, wrapper packages like `web-sdk`
should handle it. But unlike other metas, it can be also overwritten by the end-user if they have a custom mechanism for
tracking the current page.

Properties:

- `url` - the URL of the current page
- `id` - the name of the browser
- `attributes` - a key-value object with additional attributes about the current page

### SDK

The `sdk` meta defines the following properties about the Faro library itself:

- `name` - the name of the core library
- `version` - the version of the library
- `integrations` - the list of instrumentations that are used, identified by by the name and the version

The `sdk` meta is handled internally by the core package and the end-user should not change it.

### Session

The `session` meta is a static meta that is used to link signals between them. It is not handled automatically by the
core package and wrapper packages like `web-sdk` can handle it automatically. But unlike other metas, it can be also
overwritten by the end-user if they have a different way of defining what a session is.

Properties

- `id` - the name of the browser
- `attributes` - a key-value object with additional attributes about the session

### User

The `user` meta ties signals with a specific user. It is not required but it can be provided during initialization, or
programmatically, once the Faro library was initialized.

Properties:

- `id` - the ID of the user
- `username` - the username of the user
- `email` - the user's email
- `attributes` - a key-value object with additional attributes about the current user

### View

The `view` meta lets developers define a view to associate with signals that occured within that view. This makes it
easy to track specific sections in the UI which may dynamically change without any route changes. For example, a view
can be a category called `auth` that contains sign in and sign up pages. The `view` meta is not changing automatically
across a session and even though it is not handled automatically by the core package, wrapper packages like `web-sdk`
should give a value default to it. Unlike other metas, it can be also overwritten by the end-user during initialization
or programmatically afterwards.

Properties:

- `name` - the name of the current view

## Metas SDK

The metas SDK is the internal handler for the metas component. It is responsible for keeping track of the current metas
values as well as the getters for the dynamic metas.

Methods and properties:

- `add()` - adds a new meta
- `remove()` - removes a specific meta
- `addListener()` - adds a new listener
- `removeListener()` - removes a specific listener
- `value` - accesses the current value of the static metas
