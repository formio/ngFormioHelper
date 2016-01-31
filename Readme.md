This is a helper module to build Angular.js applications on top of Form.io
===============
Use this helper if you would like to build an Angular.js application that utilizes Form.io authentication and other
necessary elements that you need to build an application.

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

Usage
---------------
There are several modules that you can use within your application.


  - **FormioAuthProvider** - This allows you to register the authentication login pages and provide the authenticated and anonymous states.
    ```
.config(function(FormioAuthProvider) {

    // Set the base url for formio.
    FormioAuthProvider.setStates('auth.login', 'home');
    FormioAuthProvider.setForceAuth(true);
    FormioAuthProvider.register('userLogin', 'user', 'user/login');
    FormioAuthProvider.register('customerLogin', 'customer', 'customer/login');
    ```

  - **FormioAuth** - You need to run the **init()** method in order to initialize all of the authentications.
    ```
.run(function(FormioAuth) {

    // Initialize the Form.io authentication provider.
    FormioAuth.init();
    ```

  - **FormioAlerts** - Keeps track of all alters that are made within your application.
    You can add this to your page by adding the following...

    ```
<uib-alert ng-repeat="alert in alerts" type="{{alert.type}}" close="closeAlert($index)">{{alert.message}}</uib-alert>
    ```

    You can then add new alerts by doing the following.

    ```
FormioAlerts.addAlert({
    type: 'danger',
    message: 'Your session has expired. Please log in again.'
});
    ```

