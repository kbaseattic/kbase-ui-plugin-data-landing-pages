define([
    'plotly'
], function (
    plotly
) {
    function render(node, input) {
        var layout = {
            title: '<b>Contig Length Distribution</b>',
            fontsize: 24,
            xaxis: { title: '<b>Length (bp)</b>' },
            yaxis: { title: '<b>Count</b>' }
        };
        var data = [{
            x: Object.keys(input.assembly.contig_lengths).map(function (id) { return input.assembly.contig_lengths[id]; }),
            type: 'histogram',
            marker: { line: { width: 1, color: 'rgb(255,255,255)' } }
        }];

        node.innerHTML = '';
        plotly.plot(node, data, layout);
    }

    return {
        render: render
    };
});