This is a helper module to build Angular.js applications on top of Form.io
===============
Use this helper if you would like to build an Angular.js 1.x application that utilizes Form.io to build an application.

Installation
---------------
To install this module, you simply need to use bower and install as follows.

```
bower install --save ng-formio-helper
```

We recommend using (WireDep)[https://github.com/taptapship/wiredep] to wire the dependencies into HTML application. If
you don't want to use that, then you will need to add the ```<script>``` to your page as follows.

```
<script src="bower_components/ngFormioHelper/dist/ng-formio-helper.js"></script>
```

About & Getting Started
--------------
To get started with this library, we recommend reading the [Wiki](https://github.com/formio/ngFormioHelper/wiki)

Usage
---------------
There are several providers that you can use within your application. See the [wiki](https://github.com/formio/ngFormioHelper/wiki) documentation for each provider's implementation details.

### [FormioAlerts](https://github.com/formio/ngFormioHelper/wiki/FormioAlerts-Provider)

Used to track and display alerts within your application.

### [FormioAuth](https://github.com/formio/ngFormioHelper/wiki/FormioAuth-Provider)

Used to manage login/logout, tokens and forced authentication.

### [FormioForms](https://github.com/formio/ngFormioHelper/wiki/FormioForms-Provider)

Used to create a dynamic list of tagged forms along with all the states, views and controllers.

### [FormioOffline](https://github.com/formio/ngFormioHelper/wiki/FormioOffline-Provider)

Used to set up offline mode for your application and provides widgets and settings for offline mode.

**Requires** a paid formio plan which provides access to the offline plugin.

### [FormioResource](https://github.com/formio/ngFormioHelper/wiki/FormioResource-Provider)

Used to set up ui-router states, views and default controllers for a Formio Resource.
