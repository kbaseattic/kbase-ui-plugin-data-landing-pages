/**
 * Output widget for visualization of genome annotation.
 * @public
 */
/*
Known issues/tasks:
1) resize window sets svg width to zero of contig browser of non-visible tabs, so they dissappear
2) we don't know the length of the contig when rendering the gene context browser, so scale goes
   beyond the actual contig
3) color the features based on type, other things?
4) adjust height based on number of tracks
5) show assembly info on overview tab
*/
define([
    'jquery',
    'bluebird',
    'kb_common/jsonRpc/dynamicServiceClient',
    'kb_common/html',
    '../../utils',

    'datatables_bootstrap'
], function (
    $,
    Promise,
    GenericClient,
    html,
    utils
) {
    'use strict';

    function tabData() {
        var names = ['Overview', 'Browse Features', 'Browse Contigs'];
        var ids = ['overview', 'browse_features', 'browse_contigs'];
        return {
            names: names,
            ids: ids
        };
    }

    function link_to_ontology(id) {
        var goUrl = 'http://amigo.geneontology.org/amigo/term/';
        var tokens = id.split(':');
        if (tokens.length > 1) {
            if (tokens[0] === 'GO') {
                return $('<a href="' + goUrl + id + '" target="_blank">')
                    .append(id);
            }
        }
        return id;
    }

    function numberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function getFeatureLocationBounds(locationObject) {
        var loc = {};
        if (locationObject['strand'] && locationObject['strand'] === '-') {
            loc['end'] = locationObject['start'];
            loc['start'] = loc['end'] - locationObject['length'];

        } else {
            // assume it is on + strand
            loc['start'] = locationObject['start'];
            loc['end'] = loc['start'] + locationObject['length'];
        }
        return loc;
    }

    function numberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function factory(config) {
        var width = 1150;
        var lastElemTabNum = 0;
        var runtime = config.runtime;
        var container, hostNode;

        var genomeRef;

        // VARIOUS STUFF

        function normalizeGenomeDataFromNarrative(genome_info, genome_ref) {
            return normalizeGenomeMetadata(genome_info['meta'], genome_ref)
                .then(function (genomeData) {
                    genomeData['ws_obj_name'] = genome_info['name'];
                    genomeData['version'] = genome_info['version'];
                    genomeData['ref'] = genome_info['ws_id'] + '/' + genome_info['name'] + '/' + genome_info['version'];
                    return genomeData;
                });
        }

        function normalizeGenomeDataFromQuery(wsReturnedData, genome_ref) {
            var info = wsReturnedData['info'];
            var metadata = info[10];
            return normalizeGenomeMetadata(metadata, genome_ref)
                .then(function (genomeData) {
                    genomeData['ws_obj_name'] = info[1];
                    genomeData['version'] = info[4];
                    genomeData['ref'] = info[6] + '/' + info[1] + '/' + info[4];
                    return genomeData;
                });
        }

        function normalizeGenomeMetadata(metadata, genome_ref, noDataCallback) {
            return Promise.try(function () {
                    if (metadata.Name) {
                        return {
                            scientific_name: metadata.Name,
                            domain: '',
                            genetic_code: '',
                            source: '',
                            source_id: '',
                            taxonomy: '',
                            n_features: ''
                        };
                    } else {
                        // no scientific name, so ug.  we should refetch and get the basic information
                        // TODO: this is a promise, so this won't work.
                        return getGenomeDataDirectly(genome_ref);
                    }
                })
                .then(function (genomeData) {
                    if (metadata['Domain']) {
                        genomeData.domain = metadata['Domain'];
                    }
                    if (metadata['Genetic code']) {
                        genomeData.genetic_code = metadata['Genetic code'];
                    }
                    if (metadata['Source']) {
                        genomeData.source = metadata['Source'];
                    }
                    if (metadata['Source ID']) {
                        genomeData.source_id = metadata['Source ID'];
                    }
                    if (metadata['Taxonomy']) {
                        genomeData.taxonomy = metadata['Taxonomy'];
                    }
                    if (metadata['Number features']) {
                        genomeData.n_features = metadata['Number features'];
                    }
                    return genomeData;
                });
        }

        function getGenomeDataDirectly(genome_ref) {
            var included = ['domain', 'genetic_code', 'id', 'num_features',
                'scientific_name', 'source', 'source_id', 'taxonomy'
            ];
            var genomeApi = new GenericClient({
                module: 'GenomeAnnotationAPI',
                url: runtime.config('services.service_wizard.url'),
                token: runtime.service('session').getAuthToken()
            });
            return genomeApi
                .callFunc('get_genome_v1', [{
                    genomes: [{
                        ref: genome_ref
                    }],
                    included_fields: included
                }])
                .then(function (data) {
                    var info = data['genomes'][0]['info'];
                    var genomeData = data['genomes'][0]['data'];
                    genomeData['ws_obj_name'] = info[1];
                    genomeData['version'] = info[4];
                    genomeData['ref'] = info[6] + '/' + info[1] + '/' + info[4];

                    // normalize these data fields too
                    if (!genomeData['domain']) {
                        genomeData.domain = '';
                    }
                    if (!genomeData['genetic_code']) {
                        genomeData.genetic_code = '';
                    }
                    if (!genomeData['source']) {
                        genomeData.source = '';
                    }
                    if (!genomeData['source_id']) {
                        genomeData.source_id = '';
                    }
                    if (!genomeData['taxonomy']) {
                        genomeData.taxonomy = '';
                    }
                    if (!genomeData['num_features']) {
                        genomeData.n_features = '';
                    }

                    return genomeData;
                });
        }

        function renderError(err) {
            console.error(err);
            var errorMsg = '';
            if (err.error) {
                errorMsg = JSON.stringify(err.error);
                if (err.error.message) {
                    errorMsg = err.error.message;
                    if (err.error.error) {
                        errorMsg += '<br><b>Trace</b>:' + err.error.error;
                    }
                } else {
                    errorMsg = JSON.stringify(err.error);
                }
            }
            container.innerHTML = div({
                class: 'alert alert-danger'
            }, errorMsg);
        }

        // APP CYCLE

        // function renderOverviewPanel() {
        //     div({
        //         style: {
        //             marginTop: '15px'
        //         }
        //     }, div({
        //             class: 'row'
        //         }, [
        //             div({
        //                 class: 'col-md-8'
        //             }, [
        //                 table({
        //                     class: 'table table-striped table-bordered table-hover',
        //                     style: {
        //                         marginLeft: 'auto',
        //                         marginRight: 'auto',
        //                         wordWrap: 'break-word',
        //                         tableLayout: 'fixed'
        //                     }
        //                 }, [
        //                     colgroup([
        //                         col({
        //                             span: '1',
        //                             style: 'width: 25%'
        //                         })
        //                     ])
        //                 ])
        //             ]),
        //             div({
        //                 class: 'col-md-4'
        //             })
        //         ])
        //     );

        //     var id = '<a href="/#dataview/' + genomeData.ref + '" target="_blank">' + genomeData.ws_obj_name + '</a>'

        //     var scientific_name = genomeData.scientific_name;
        //     var domain = genomeData.domain;
        //     var genetic_code = genomeData.genetic_code;
        //     var source = genomeData.source;
        //     var source_id = genomeData.source_id;

        //     var taxonomy = $('<td>');
        //     var taxLevels = genomeData.taxonomy.split(';');
        //     for (var t = 0; t < taxLevels.length; t++) {
        //         for (var space = 0; space < t; space++) {
        //             if (space === 0) { taxonomy.append('<br>'); }
        //             taxonomy.append('&nbsp;&nbsp;');
        //         }
        //         taxonomy.append(taxLevels[t]);
        //     }
        //     if (taxonomy.html() === '') {
        //         taxonomy.empty().append('None available.');
        //     }
        //     $taxonomyDiv.append($('<table>').addClass('table table-striped table-bordered table-hover')
        //         .append($('<tr>').append($('<td>').append('<b>Taxonomy</b>')))
        //         .append($('<tr>').append(taxonomy)));

        //     var n_features = genomeData.n_features;
        //     if (n_features) {
        //         n_features = numberWithCommas(n_features);
        //     }

        //     var overviewLabels = [
        //         'KBase Object Name',
        //         'Scientific Name',
        //         'Domain',
        //         'Genetic Code',
        //         'Source',
        //         'Source ID',
        //         'Number of Features'
        //     ];

        //     var overviewData = [
        //         id,
        //         scientific_name,
        //         domain,
        //         genetic_code,
        //         source,
        //         source_id,
        //         n_features
        //     ];

        //     for (var i = 0; i < overviewData.length; i++) {
        //         $overviewTable.append(
        //             $('<tr>')
        //             .append($('<td>').append($('<b>').append(overviewLabels[i])))
        //             .append($('<td>').append(overviewData[i])));
        //     }
        // }

        //     function renderTabs(genomeData) {
        //         container.empty();
        //         var $tabPane = $('<div id="' + pref + 'tab-content">');
        //         container.append($tabPane);
        //         var tabObj = new kbaseTabs($tabPane, { canDelete: true, tabs: [] });

        //         var tabData = self.tabData(genomeData);
        //         var tabNames = tabData.names;
        //         var tabIds = tabData.ids;

        //         for (var i = 0; i < tabIds.length; i++) {
        //             var tabDiv = $('<div id="' + pref + tabIds[i] + '"> ');
        //             tabObj.addTab({ tab: tabNames[i], content: tabDiv, canDelete: false, show: (i == 0) });
        //         }

        //         ////////////////////////////// Overview Tab //////////////////////////////


        //         var liElems = $tabPane.find('li');
        //         for (var liElemPos = 0; liElemPos < liElems.length; liElemPos++) {
        //             var liElem = $(liElems.get(liElemPos));
        //             var aElem = liElem.find('a');
        //             if (aElem.length != 1)
        //                 continue;
        //             var dataTab = aElem.attr('data-tab');
        //             var genome_ref = self.genome_ref;
        //             if (dataTab === 'Browse Features') {
        //                 aElem.on('click', function () {
        //                     self.buildGeneSearchView({
        //                         $div: $('#' + pref + 'browse_features'),
        //                         genomeSearchAPI: self.genomeSearchAPI,
        //                         ref: genome_ref,
        //                         idClick: function (featureData) {
        //                             self.showFeatureTab(genome_ref, featureData, pref, tabObj);
        //                         },
        //                         contigClick: function (contigId) {
        //                             self.showContigTab(genome_ref, contigId, pref, tabObj);
        //                         }
        //                     })
        //                 });
        //             } else if (dataTab === 'Browse Contigs') {
        //                 aElem.on('click', function () {
        //                     self.buildContigSearchView({
        //                         $div: $('#' + pref + 'browse_contigs'),
        //                         genomeSearchAPI: self.genomeSearchAPI,
        //                         ref: genome_ref,
        //                         contigClick: function (contigId) {
        //                             self.showContigTab(genome_ref, contigId, pref, tabObj);
        //                         }
        //                     });
        //                 });
        //             }
        //         }


        //     };
        // }

        function render() {

            container.innerHTML = div({
                style: {
                    textAlign: 'center'
                }
            }, html.loading());

            var genomeApi = new GenericClient({
                module: 'GenomeAnnotationAPI',
                url: runtime.config('services.service_wizard.url'),
                token: runtime.service('session').getAuthToken()
            });

            // get info from metadata
            genomeApi.callFunc('get_genome_v1', [{
                    genomes: [{
                        ref: genomeRef
                    }],
                    no_data: 1
                }])
                .then(function (data) {
                    console.log('HERE', data);
                    container.innerHTML = 'ta da!';
                    // return normalizeGenomeDataFromQuery(data['genomes'][0]);
                })
                .catch(function (err) {
                    renderError(err);
                });

            return this;
        }

        // LIFECYCLE API

        function init() {

        }

        function attach(node) {
            hostNode = node;
            container = hostNode.appendChild(document.createElement('div'));
        }

        function start(params) {
            genomeRef = utils.getRef(params);
            container.innerHTML = 'Genome Annotation Here';
            // return render();
        }

        function stop() {
            return Promise.try(function () {
                // nothing?

            });
        }

        function detach() {
            if (hostNode && container) {
                hostNode.removeChild(container);
            }
        }

        return {
            attach: attach,
            start: start,
            stop: stop,
            detach: detach
        };
    }

    return {
        make: function (config) {
            return factory(config);
        }
    };


});