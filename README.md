# Data API Landing Pages

Javascript code and supporting content for KBase data api based Landing Pages.
This covers Taxon, Assembly, GenomeAnnotation typed data.

## Quick Start for Developing Landing Page content only, no API changes

### 1. Clone your fork of kbase-ui-plugin-data-landing-pages
```
git clone https://github.com/<username>/kbase-ui-plugin-data-landing-pages
```

### 2. Clone your fork of kbase-ui using defaults 'dev' and target 'ci'
```
git clone -b develop https://github.com/<username>/kbase-ui
cd kbase-ui
cp -pr config dev/config
```

- Init the repo for bower and npm and build dependencies
*NOTE* these steps may take a few minutes to complete
```
make init
make build
```

#### Troubleshooting make init
If you have trouble with an older version of npm, you can update with ```npm install npm -g```


### 3. Use your copy of kbase-ui-plugin-data-landing-pages when building kbase-ui

- Recommended for local file development, symlink your local directory, don't use make build after each edit
*Important* Running ```make build``` again will destroy this link.
```
rm -rf build/build/client/modules/plugins/data-landing-pages
ln -s `pwd`/../kbase-ui-plugin-data-landing-pages/src/plugin build/build/client/modules/plugins/data-landing-pages
```

- Alternatively if you do not wish to symlink, use build.yml and make build after each edit
  - Edit the config dev/config/ui/dev/build.yml, and modify the stanza for kbase-ui-plugin-data-landing-pages.
    *Note* that this directory must be the parent of kbase-ui-plugin-data-landing-pages.
```
    -
        name: data-landing-pages
        globalName: kbase-ui-plugin-data-landing-pages
        version: x.y.z
        cwd: src/plugin
        source:
            #bower: {}
            directory:
                root: /absolute/path/to/parent/
```

### 4. Start kbase-ui
This starts a static nodejs server at :8080.

*NOTE* You will need to either disable CORS in the developer settings of your browser, or run a local proxy that provides a localhost namespace for KBase services.

```
make start
```

### 4a. (optional) Launch browser window
This launches your default browser with a local instance of the kbase ui.
```
make preview
```

### 5. Stopping kbase-ui local nodejs server
```
make stop
```

### 6. Release tags

- In order to propagate changes to kbase-ui-plugin-data-landing-pages to an instance of KBase, those changes must be tagged as a release, and then a commit to kbase-ui will have to be completed that updates the version to match the new release.


## Additional Info

### Sample Landing Pages
- GenomeAnnotation
http://localhost:8080/#dataview/8020/39/1
- Assembly
http://localhost:8080/#dataview/8020/30/1
- Taxon
http://localhost:8080/#dataview/1779/523209/1

## Registering in Bower

[ coming soon ] 
