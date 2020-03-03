## Dev-center registration

> Note: Currently, dev center is new and not stable. You can't create an out of iframe app just using dev center. You have to use rpc calls to app service to configure correctly your widget.

### Create your app
Initially, you probably need the app configured to work with your localhost. So all next examples are based on local configuration.

Steps to register your app in dev center:
- Just go to the new dev center: https://dev.wix.com/dc3/my-apps
- Click **`Create New App`** on the top right.
- *(Optional, but useful)*: Rename your app: Go to **Market Listing** -> **App Name** and change the name to something you want.

### Create your app's components (local development)
- **Platform component** (required)
> Each app should contain one platform component. This component responsible for loading `viewerScript` for your app which all collects OOI widgets and OOI Page controllers.
- *Register platform component (viewerScript):*
  - Pick some name for your platform component.
  - Add `viewerScript` url to `Viewer URL` field. For example, for local development it will be `https://localhost:3200/viewerScript.bundle.js`.

- **OOI Widget** / **OOI Page**
> Out of Iframe Component, which contain UI logic as a React Component and functional logic as a controller. Being rendered on both editor and viewer parts. You should create new OOI widget for each widget in your project. This approach will be automated in future.
- *Register Out of iFrame Widget (viewerWidget + editor endpoints):*
  - Fill the name of your component.
  - In **Widget Info** section add `[:componentName]ViewerWidget` url to `Component URL`. For example, `https://localhost:3200/buttonViewerWidget.bundle.js`. This will configure platform to render component in viewer.

  - In **Widget Endpoints** section add:
    - Editor endpoint to render your widget via `Component URL`. It could be your server or static html file url (see more: [#2013](https://github.com/wix/yoshi/issues/2013)), which will be rendered in iFrame by platform. For local development (after you start the app by `yoshi-flow-editor start`) it will be available by: `https://localhost:3000/editor/:componentName`.
    - Settings Panel endpoint. Server or static html url which will render settings for your widget. For local development it will be `https://localhost:3000/settings/:componentName`.
  - Update your **local app**. Each widget should be represented by component in your app. To map dev center widget with your component just add `"id": "{Widget ID}"` to `.component.json` in the component's directory. This will allow yoshi to create all the magic under the hood.


> **OOI Page** - The same as OOI Widget, but renders as a page. After adding it to your site, you can see it in the top left website navigation or via specific page url on the viewer site. The dev center configuration process is pretty the same as OOI Widget.


### Configuring production app
All examples above contain local development examples (using `localhost`). There are few basic concepts of working with production environment.

#### Different apps for local and prod
In this scenario we are configuring apps separately. For local one we are using localhost, for prod it will be CDN urls.

To **deploy your app to prod**, you need to add it to lifecycle as a regular app.
For more info, please check out [Deployment and CI part from Fed-handbook](https://github.com/wix-private/fed-handbook/blob/master/DEPLOYMENT_AND_CI.md).

After your CI build is green ✅, you are available to get `viewerScript` and `viewerWidget`s for your *platofrm* and *OOI Widget* components from CDN.
Url format is:
- **viewerScript**: `https://static.parastorage.com/services/{artifactId}/1.0.0/viewerScript.bundle.min.js`
- **viewerWidget** for component with name `button`: `https://static.parastorage.com/services/{artifactId}/1.0.0/[:componentNane]ViewerWidget.bundle.min.js` *(for ex. `buttonViewerWidget.bundle.min.js`)*
- **Editor widget endpoint**: `https://static.parastorage.com/services/{artifactId}/1.0.0/editor/[:componentName].html` *(for ex. `button.html`)*
- **Editor settings panel endpoint**: `https://static.parastorage.com/services/{artifactId}/1.0.0/settings/[:componentName].html`
> Please note that we **should** use 1.0.0 version, b/c it will be overrided under the hood each time you release new RC version.

#### Using static override
To be added.

### Troubleshooting new app registration
Currently, new dev center is not supporting some features.

##### Needed fields is missing for newly created apps
You can find out that your app is not appearing on your website after installation or clicking `Test Your App`. Other issue is that only one widget is loading on the website.

To review your app's model, visit
https://dev.wix.com/_api/app-service/v1/apps/{appDefinitionId}

The main thing here is `components` array. There are 2 issues:
- At least one component should have `default: true` field.
- If we want to load multiple widgets on the same time, we should add `essential: true` to component's that are not default, but should be loaded with it.

Since Dev Center is not supporting it for now, we can use RPC calls bypassing Dev Center:

- Connect to VPN.
- [Go to RPC console](https://pbo.wixpress.com/rpc-console-poc/app-service-webapp/ip-10-43-142-184.ec2.internal/Components/update?W3siY29tcFR5cGUiOiJXSURHRVRfT1VUX09GX0lGUkFNRSIsImNvbXBOYW1lIjoiYnV0dG9uIG9rb2siLCJjb21wSWQiOiIvLyBDT1BZIEZST00gREVWX0NFTlRFUiIsImFwcElkIjoiLy8gQ09QWSBGUk9NIERFVl9DRU5URVIiLCJjb21wRGF0YSI6eyJ3aWRnZXRPdXRPZklmcmFtZURhdGEiOnsid2lkZ2V0RGF0YSI6eyJzZW9FbmRwb2ludFVybCI6bnVsbCwic2V0dGluZ3NFbmRwb2ludFVybCI6Imh0dHBzOi8vbG9jYWxob3N0OjMwMDAvc2V0dGluZ3MvYnV0dG9uIiwid2lkZ2V0RW5kcG9pbnRVcmwiOiJodHRwczovL2xvY2FsaG9zdDozMDAwL2VkaXRvci9idXR0b24iLCJlc3NlbnRpYWwiOnRydWUsInB1Ymxpc2hlZCI6ZmFsc2UsImhlaWdodCI6MjUwLCJmaXhlZFBvc2l0aW9uT3B0aW9uIjp7IndpZGdldEhvcml6b250YWwiOiJOT05FX0hPUklaT05UQUwiLCJ3aWRnZXRWZXJ0aWNhbCI6Ik5PTkVfVkVSVElDQUwifSwid2lkZ2V0TW9iaWxlRW5kcG9pbnRVcmwiOm51bGwsIndpZGdldERpc3BsYXkiOm51bGwsIndpZGdldFdpZHRoVHlwZSI6IkNVU1RPTSIsInRwYVdpZGdldElkIjoiLy8gdGhlIHNhbWUgYXMgY29tcElkIiwiZGVmYXVsdCI6dHJ1ZSwicG9zaXRpb24iOm51bGwsIndpZHRoIjoyNTAsImFkZE9ubHlPbmNlIjpmYWxzZX0sImNvbnRyb2xsZXJVcmwiOm51bGwsImNvbXBvbmVudFVybCI6Imh0dHBzOi8vbG9jYWxob3N0OjMyMDAvYnV0dG9uVmlld2VyV2lkZ2V0LmJ1bmRsZS5qcyJ9fX1d.eyJ3aXhTZXNzaW9uIjoiIn0=). Sign in if needed
- Go to [Dev Center](https://dev.wix.com/dc3/my-apps) and select your app. (You will need this to copy app id and component id).
- Fill `appId` from Dev center's `Dashboard` -> `App ID`.
- Fill `compId` from Dev center's `Components` -> `{Your OOI Component}` -> `Widget ID`. Paste the same value to  `tpaWidgetId` field.
- Verify `essential`, `default` (if it's first component) selected.
- Paste your WixSession token to `Identity` -> `WixSession` at the bottom of RPC console. You can take this token from your cookie. It's everything that is going after `wixSession2=` untill `;` or end of string.

> All fields will be set to default after you update it from Dev Center again. So, if you have some issues and using RPC to fix it, please don't update the same components via Dev Center, untill issues will be resolved on it's side.

##### Versions are not being updated automatically
Currently, Dev Center is not updating new versions via `.ci_config`. Only manual updating approach is working if you created a new RC version.
Just go to component's configuration and update versions for all needed urls:
```diff
- https://static.parastorage.com/services/{artifactId}/1.34.0/labelViewerWidget.bundle.min.js
+ https://static.parastorage.com/services/{artifactId}/1.35.0/labelViewerWidget.bundle.min.js
```
