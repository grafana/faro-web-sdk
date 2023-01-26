# Unpatched Console

The unpatched console refers to an unmodified `console` object that is used for various purposes like defining the
internal Faro logger or pointing to an alternative to the `console` object for the apps that are using a custom logger
instead.

The unpatched console is the first thing that is initialized when initializing Faro. It is then made available to all
components like internal logger, instrumentations etc.
