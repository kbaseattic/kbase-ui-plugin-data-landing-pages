define([
    'jquery',
    'bluebird',
    'bootstrap',
    'datatables',
    'kb_widget/legacy/authenticatedWidget',
    'kb_service/client/workspace',
    'kb_common/jsonRpc/dynamicServiceClient',
    'datatables_bootstrap'
], function(
    $,
    Promise,
    bootstrap,
    jquery_dataTables,
    kbaseAuthenticatedWidget,
    Workspace,
    DynamicServiceClient
) {
    'use strict';

    $.KBWidget({
        name: 'kbaseGenomeAnnotationAssembly',
        parent: kbaseAuthenticatedWidget,
        version: '1.0.0',
        options: {},

        init: function init(options) {
            this._super(options);

            this.runtime = options.runtime;

            if (this.options.ref) {
                this.obj_ref = this.options.ref;
            } else {
                this.obj_ref = this.options.wsNameOrId + '/' + this.options.objNameOrId;
            }
            this.link_ref = this.obj_ref;

            this.AssemblyClient = new DynamicServiceClient({
                url: this.runtime.getConfig('services.service_wizard.url'),
                token: this.runtime.service('session').getAuthToken(),
                module: 'AssemblyAPI'
            });

            // this.assembly = new Assembly({
            //     url: this.runtime.getConfig('services.service_wizard.url'),
            //     auth: { 'token': this.runtime.service('session').getAuthToken() },
            //     version: 'release'
            // });
            this.ws = new Workspace(this.runtime.getConfig('services.workspace.url'), {
                token: this.runtime.service('session').getAuthToken()
            });

            this.$elem.append($('<div>').attr('align', 'center').append($('<i class="fa fa-spinner fa-spin fa-2x">')));

            // 1) get stats, and show the panel
            var basicInfoCalls = [];
            var that = this;
            basicInfoCalls.push(
                this.AssemblyClient.callFunc('get_stats', [this.obj_ref])
                .then(function(result) {
                    var stats = result[0];
                    that.assembly_stats = stats;
                    return null;
                }));
            basicInfoCalls.push(
                this.AssemblyClient.callFunc('get_external_source_info', [this.obj_ref])
                .then(function(result) {
                    var info = result[0];
                    that.external_source_info = info;
                    return null;
                }));

            basicInfoCalls.push(
                this.ws.get_object_info_new({ objects: [{ 'ref': this.obj_ref }], includeMetadata: 1 })
                .then(function(info) {
                    that.assembly_obj_info = info[0];
                    that.link_ref = info[0][6] + '/' + info[0][1] + '/' + info[0][4];
                    return null;
                }));
            Promise.all(basicInfoCalls)
                .then(function() {
                    that.renderBasicTable();
                    return null;
                })
                .catch(function(err) {
                    that.$elem.empty();
                    that.$elem.append('Error' + JSON.stringify(err));
                    console.error(err);
                });

            return this;
        },

        processContigData: function() {
            var contig_table = [];
            for (var id in this.contig_lengths) {
                if (this.contig_lengths.hasOwnProperty(id)) {
                    var gc = 'unknown';
                    if (this.contig_lengths.hasOwnProperty(id)) {
                        gc = String((this.contig_gc[id] * 100).toFixed(2)) + '%';
                    }
                    var contig = {
                        id: id,
                        len: '<!--' + this.contig_lengths[id] + '-->' + String(this.numberWithCommas(this.contig_lengths[id])),
                        gc: gc
                    };
                    contig_table.push(contig);
                }
            }
            this.contig_table = contig_table;
        },

        renderBasicTable: function() {
            var $container = this.$elem;
            $container.empty();

            // Build the overview table
            var $overviewTable = $('<table class="table table-striped table-bordered table-hover" style="margin-left: auto; margin-right: auto;"/>');

            function get_table_row(key, value) {
                return $('<tr>').append($('<td>').append(key)).append($('<td>').append(value));
            }

            $overviewTable.append(get_table_row('Number of Contigs', this.assembly_stats['num_contigs']));
            $overviewTable.append(get_table_row('Total GC Content', String((this.assembly_stats['gc_content'] * 100).toFixed(2)) + '%'));
            $overviewTable.append(get_table_row('Total Length', String(this.numberWithCommas(this.assembly_stats['dna_size'])) + ' bp'));

            $overviewTable.append(get_table_row('External Source', this.external_source_info['external_source']));
            $overviewTable.append(get_table_row('External Source ID', this.external_source_info['external_source_id']));
            $overviewTable.append(get_table_row('Source Origination Date', this.external_source_info['external_source_origination_date']));


            // add the stuff
            $container.append($('<div>').append($overviewTable));
            $container.append($('<div>').append(this.addContigList()));
        },

        addContigList: function() {
            var that = this;
            var $content = $('<div>');
            this.$contigTablePanel = $content;

            // Get contig lengths and gc, render the table

            this.assembly_stats = {};
            this.contig_lengths = [];
            this.contig_gc = [];

            var loadingCalls = [];
            loadingCalls.push(
                this.AssemblyClient.callFunc('get_contig_lengths', [this.obj_ref, null])
                .spread(function(lengths) {
                    that.contig_lengths = lengths;
                }));
            loadingCalls.push(
                this.AssemblyClient.callFunc('get_contig_gc_content', [this.obj_ref, null])
                .spread(function(gc) {
                    that.contig_gc = gc;
                }));

            Promise.all(loadingCalls)
                .then(function() {
                    that.processContigData();

                    // sort extension for length- is there a better way?
                    if (!$.fn.dataTableExt.oSort['genome-annotation-assembly-hidden-number-stats-pre']) {
                        $.extend($.fn.dataTableExt.oSort, {
                            'genome-annotation-assembly-hidden-number-stats-pre': function(a) {
                                // extract out the first comment if it exists, then parse as number
                                var t = a.split('-->');
                                if (t.length > 1) {
                                    var t2 = t[0].split('<!--');
                                    if (t2.length > 1) {
                                        return Number(t2[1]);
                                    }
                                }
                                return Number(a);
                            },
                            'genome-annotation-assembly-hidden-number-stats-asc': function(a, b) {
                                return ((a < b) ? -1 : ((a > b) ? 1 : 0));
                            },
                            'genome-annotation-assembly-hidden-number-stats-desc': function(a, b) {
                                return ((a < b) ? 1 : ((a > b) ? -1 : 0));
                            }
                        });
                    }

                    ////////////////////////////// Contigs Tab //////////////////////////////
                    var $table = $('<table class="table table-striped table-bordered table-hover" style="width: 100%; border: 1px solid #ddd; margin-left: auto; margin-right: auto;" >');

                    var contigsPerPage = 10;
                    var sDom = 'lft<ip>';
                    if (that.contig_table.length < contigsPerPage) {
                        sDom = 'fti';
                    }

                    var contigsSettings = {
                        'bFilter': true,
                        'sPaginationType': 'full_numbers',
                        'iDisplayLength': contigsPerPage,
                        'aaSorting': [
                            [1, 'desc']
                        ],

                        'sDom': sDom,

                        'columns': [
                            { sTitle: 'Contig Id', data: 'id' },
                            { sTitle: 'Length (bp)', data: 'len' },
                            { sTitle: 'GC Content', data: 'gc' }
                        ],
                        'columnDefs': [
                            { 'type': 'genome-annotation-assembly-hidden-number-stats', targets: [1] }
                        ],
                        'data': that.contig_table,
                        'language': {
                            'lengthMenu': '_MENU_ Contigs per page',
                            'zeroRecords': 'No Matching Contigs Found',
                            'info': 'Showing _START_ to _END_ of _TOTAL_ Contigs',
                            'infoEmpty': 'No Contigs',
                            'infoFiltered': '(filtered from _MAX_)',
                            'search': 'Search Contigs'
                        }
                    };
                    $content.empty();
                    $content.append($('<div>').css('padding', '10px 0px').append($table));
                    $table.dataTable(contigsSettings);
                    return null;
                })
                .catch(function(err) {
                    $content.empty();
                    $content.append('Error' + JSON.stringify(err));
                    console.error(that);
                    console.error(err);
                });

            return $content.append('<br>').append($('<div>').attr('align', 'center').append($('<i class="fa fa-spinner fa-spin fa-2x">')));
        },

        appendUI: function appendUI($elem) {
            $elem.append('One day, there will be a widget here.')
        },

        numberWithCommas: function(x) {
            //var parts = x.toString().split(".");
            //parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            //return parts.join(".");
            return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }

    });

});