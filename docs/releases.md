# Creating Releases

Electron packages are made available to clients via Github releases.
Release can either be made manually, or done from the GitHub Actions page (preferred method)


## Release labels and settings

Beta releases should still be marked as "pre-release" else it is seen as stable

Beta releases should have -beta.x extension to the name. eg 3.0.0-beta.14 or 3.0.1-beta.1

Stable releases should not be ticked as "pre-release" on GitHub

Stable releases should not have anything after the version. e.g 3.0.0 or 3.0.1

## How the app behaves

If you are on a beta version (-beta.x), it will update to the latest version, not matter if it is a beta or stable

If you are on a stable version, it will only update to the latest stable version .e.g from 3.0.0 to 3.0.1


## Preparing for a release
Make sure to set the appropriate version in `package.json`. Make use of "preRelease" versions if it is not
the final stable build e.g. `x.x.x-alpha.1`, `x.x.x-beta.1`.

After changing the version make sure to perform an npm install again to update all package files
```bash
npm install
```
Make sure all is committed and pushed to GitHub

## GitHub Actions release
This is the prefered way to perform releases as it ensure reliable builds be eliminating possible
configuration differences that may be present on a developer's machine.

- Open the project on GitHub
- Navigate to the **Actions** tab
- Select **Node.js CI** on the left menu
- Select the **Run workflow** button on the right
- Select the branch you are making a release from
- Select **Run workflow**
- The build will take a few minutes to complete. You can check the progress by clicking through the task
that will be placed in the list
- Once the build is completed move to the next section below **Complete the draft release on GitHub**

![](images/release-1.png)

## Manual Release
- Set an environment variable with your github token
  ```bash
  GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  ```
- Run the build
  ```bash
  npm run deploy
  ```
- The build will take a couple of minutes to complete
- Once the build is completed move to the next section below **Complete the draft release on GitHub**

![](images/release-2.png)
Example configuration for building a release with an IntelliJ build profile

## Complete the draft release on GitHub
After a release has been made (manually or via GitHub Actions) it will create a draft release on the 
GitHub portal which can be published from there.

- Open the project on GitHub
- Navigate to the **Releases** section on the right of the page
- You will see a draft release waiting to be published
- Make sure to select the correct branch the tag should be created on
- You can fill in a description of what has changed in this release. For stable releases it is highly recommended to complete this
- If this is a beta release, make sure to select the tickbox **Set as pre-release**
- Only if this release is the lastest stable release (not a beta!) select **Set as the latest release**
