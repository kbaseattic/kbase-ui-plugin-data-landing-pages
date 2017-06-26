define([
    'plotly'
], function (
    plotly
) {
    function render(node, input, options) {
        var layout = {
            title: '<b>Contig Length</b>',
            fontsize: 24,
            xaxis: { title: '<b>Contig Index</b>' },
            yaxis: { title: '<b>Length (bp)</b>' }
        };
        var data = [{
            y: input.assembly.contig_ids.map(function (id) { return input.assembly.contig_lengths[id]; }),
            x: input.assembly.contig_ids.map(function (id) { return input.assembly.contig_ids.indexOf(id); }),
            type: 'scatter',
            mode: 'lines',
            marker: { color: options.markerColor },
            hoverinfo: 'x+y'
        }];
        node.innerHTML = '';
        plotly.plot(node, data, layout);
    }

    return {
        render: render
    };
});