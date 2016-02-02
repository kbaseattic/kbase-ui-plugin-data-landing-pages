# Data API Dataview Widgets

Javascript code and supporting content for KBase data api based widgets

## Quick Start for Developing

First, it would be good to get kbase-ui at [https://gitub.com/kbase/kbase-ui]() and ensure that you are set up and able to do the basic build and preview. In short,

```
git clone -b develop https://github.com/kbase/kbase-ui
cd kbase-ui
make init
make build
make start
make preview
```

This sets up the build environment, builds a developer version of the ui, starts a little static nodejs server at on :8080, and launches the default browser pointed at that local server.

The basic process is then to iterate over

- edit
- make build
- refresh browser

### Developing a Plugin

Install the plugin alongside kbase-ui

- clone https://github.com/kbase/kbase-ui-plugin-data-landing-pages
- in kbase ui, make a developer copy of the build config
    - ```cp -pr kbase-ui/config kbase-ui/dev/config```
- add a stanza for the plugin to the config
    - vi kbase-ui/dev/config/ui/dev/build.yml
    - in the plugins section add something like the following. 
        - You will need to set ```root``` to the directory containing the plugin repo.

```
    -
        name: data-landing-pages
        globalName: kbase-ui-plugin-data-landing-pages
        version: 0.1.0
        cwd: src/plugin
        source:
            # uncomment the bower property to have the build fetch from bower/github
            # bower: {}
            # use something like this to feed bower a specific alternate version spec.
            # in this case a specific github repo and branch
            # bower:
            #     version: you/kbase-ui-plugin-data-landing-pages#master
            # comment this out if bower us activated
            directory: 
                # NB the root is the directory which contains this plugin, which
                # must be located within a directory whose name is the globalName
                root: /Users/you/work/kbase/sprints/data-api-widgets
``` 
    
This setup will allow the "classic" edit-build-refresh workflow to integrate the plugin. Since the data api landing page repo contains just data widgets, there is no need for further configuration of the ui.

If you hop back into kbase-ui and issue ```make build``` the plugin will be operational.

You can test this by visiting a dataview url which should invoke an appropriate object (see the data api demo menu item which provides links to inspect compatible objects -- the references can pasted into the dataview url.)

For example, one available in CI now is: http://localhost:8080/#dataview/1779/1006539/1

### Faster Develop Workflow

It is very simple to set up a faster edit-refresh workflow. Simply link your plugin directly into the build and refrain from running *make build*. For example, something like this from the parent directory of kbase-ui and the plugin:

```
rm -rf kbase-ui/build/build/client/modules/plugins/data-landing-pages
ln -s `pwd`/kbase-ui-plugin-data-landing-pages/src/plugin kbase-ui/build/build/client/modules/plugins/data-landing-pages
```

## Registering in Bower

[ coming soon ] 


## Integrating into the Developer and Production Build

### Developer Build

The configuration file you copied into kbase-ui/dev will not be commited in to the project. This protects the project integrity, but also does not add your plugin to the ui either. To incorporate it into the ui, you just need to add a stanza as before, but this time have it loaded from bower:

- edit kbase-ui/config/ui/dev.yml
- add the following stanza to the plugins section:

```
    -
        name: data-landing-pages
        globalName: kbase-ui-plugin-data-landing-pages
        version: 0.1.0
        cwd: src/plugin
        source:
            bower:
                version: kbase/kbase-ui-plugin-data-landing-pages#master
```

Note that this does not require registration with bower, it is pulled straight from github.

If you want the developer build to go against your personal account, because that is where rapid change is happening, then you may want to swap kbase/ with youraccount/. Note that this is a little dodgy since other developers may pick up work-in-progress pushes. To protect against that, make periodic semver tags and update and push up the developer config as need be:

```
    -
        name: data-landing-pages
        globalName: kbase-ui-plugin-data-landing-pages
        version: 0.1.0
        cwd: src/plugin
        source:
            bower:
                version: you/kbase-ui-plugin-data-landing-pages#v0.1.0
```

Not here that the semver tag "v0.1.0" is the full tag string, and that a branch or tag may be used in the version property. Also note that whereas the github semver tag is prefixed with a "v", the version specification "0.1.0" operates with the bower registry, which expects a standard semver string.

### Production Build

[ coming soon ]
