# Windows Installer
[Electron Builder](https://www.electron.build/) is responsible for packaging the application into an installer (using [NSIS](https://nsis.sourceforge.io/Main_Page))
which can be distributed

Customizations to the default installer has been made to achieve the following

- Prompt user to install Libre Office
- If user selected yes, download and install Libre Office also

An additional plugin has been added to the installer do handle the download of the Libre Office installer
-  [NScurl](https://github.com/negrutiu/nsis)

For more information on changing the electron installer see [Custom NSIS script](https://www.electron.build/configuration/nsis#custom-nsis-script)
