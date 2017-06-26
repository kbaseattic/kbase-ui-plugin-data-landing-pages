define([
    'jquery',
    'bluebird',
    'kb_common/html',
    'kb_common/bootstrapUtils',
    'kb_common/jsonRpc/dynamicServiceClient',
    '../utils',
    './assemblySummary',
    './assemblyContigs'
    // './assemblyStats'
], function (
    $,
    Promise,
    html,
    BS,
    DynamicServiceClient,
    utils,
    AssemblySummary,
    AssemblyContigs
    //AssemblyStats
) {
    'use strict';
    var t = html.tag,
        div = t('div');

    function factory(config) {
        var hostNode, container,
            runtime = config.runtime;

        var widgets = [{
                module: AssemblySummary,
                id: 'summary'
            }, {
                module: AssemblyContigs,
                id: 'contigs'
            }
            // {
            //     module: AssemblyStats,
            //     id: 'stats'
            // }
        ];
        widgets.forEach(function (widget) {
            widget.instance = widget.module.make({
                runtime: runtime
            });
        });

        // VIEW

        function layout() {
            return div([
                BS.buildPanel({
                    type: 'default',
                    title: 'Summary',
                    body: div({
                        dataElement: 'summary'
                    })
                }),
                BS.buildPanel({
                    type: 'default',
                    title: 'Contigs',
                    body: div({
                        dataElement: 'contigs',
                        style: {
                            marginTop: '20px'
                        }
                    })
                })
                // BS.buildPanel({
                //     type: 'default',
                //     title: 'Assembly Statistics',
                //     body: div({
                //         dataElement: 'stats',
                //         style: {
                //             marginTop: '20px'
                //         }
                //     })
                // })
            ]);
        }

        // WIDGET API

        function attach(node) {
            hostNode = node;
            container = hostNode.appendChild(document.createElement('div'));
            container.innerHTML = layout();
            return Promise.all(widgets.map(function (widget) {
                return widget.instance.attach(container.querySelector('[data-element="' + widget.id + '"]'));
            }));
        }

        function start(params) {
            // get the assembly reference
            var assemblyRef = utils.getRef(params);

            return Promise.all(widgets.map(function (widget) {
                return widget.instance.start({
                    objectRef: assemblyRef
                });
            }));
        }

        function stop() {
            return Promise.all(widgets.map(function (widget) {
                return widget.instance.stop();
            }));
        }

        function detach() {
            return Promise.all(widgets.map(function (widget) {
                return widget.instance.detach();
            })).then(function () {
                if (hostNode && container) {
                    container.innerHTML = '';
                    hostNode.removeChild(container);
                }
            });
        }

        return Object.freeze({
            attach: attach,
            start: start,
            stop: stop,
            detach: detach
        });
    }

    return {
        make: function (config) {
            return factory(config);
        }
    };
});