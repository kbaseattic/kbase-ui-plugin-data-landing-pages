define([
    'plotly'
], function (
    plotly
) {
    function render(node, input, options) {
        var layout = {
            title: '<b>GC by Contig Length</b>',
            fontsize: 24,
            xaxis: { title: '<b>Contig GC%</b>' },
            yaxis: { title: '<b>Contig length (bp)</b>' }
        };
        var data = [{
            type: 'scatter',
            mode: 'markers',
            x: input.assembly.contig_ids.map(function (id) {
                return input.assembly.contig_gc_content[id] * 100.0;
            }),
            y: input.assembly.contig_ids.map(function (id) {
                return input.assembly.contig_lengths[id];
            }),
            text: input.assembly.contig_ids,
            hoverinfo: 'all',
            marker: { color: options.markerColor }
        }];
        node.innerHTML = '';
        plotly.plot(node, data, layout);
    }

    return {
        render: render
    };
});