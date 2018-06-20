# Change Log
All notable changes to this project will be documented in this file

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## 1.8.3
### Fixed
 - Problem where refreshing the app would always redirect you back to the login auth page.
 - Issues where whenReady would fire to early when the user was not established.

## 1.8.2
### Fixed
 - The SSO to not require html5Mode(true)

## 1.8.0
### Fixed
 - Issues with the FormioAuth provider where it would call endpoints too early.

### Changed
 - Upgraded all dependencies.

### Added
 - Support for OpenID Connect SSO

## 1.4.6
### Added
 - When session expires, save state so redirected back to original page after login/register.

## 1.4.5
### Changed
 - Rebuild dist directory.

## 1.4.4
### Fixed
 - Fix deprecation warning around setAppUrl and getAppUrl.

## 1.4.3
### Fixed
 - Offline error forms not working.

## 1.4.2
### Fixed
 - Load more than 10 roles in access.

## 1.4.1
### Added
 - When user registers or logs in, redirect them back to the page they were attempting to visit.
