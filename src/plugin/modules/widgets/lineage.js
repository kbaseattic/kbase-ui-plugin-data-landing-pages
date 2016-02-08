/*global define */
/*jslint white: true, browser: true */
define([
    'kb/common/html',
    'kb/data/genomeAnnotation',
    'kb/data/taxon',
    'kb/data/assembly',
    '../utils',
    'bluebird',
    'jquery'
],
    function (html, GenomeAnnotation, Taxon, Assembly, utils, bluebird, jquery) {
        'use strict';

        function factory(config) {
            var parent, container, runtime = config.runtime,
                div = html.tag('div'),
                templates = {
                    overview: "<div class='row'>"
                            + "    <div class='col-md-6'>"
                            + "        <table class='table table-bordered'>"
                            + "            <tr><td><b>NCBI taxonomic ID</b></td><td data-element='ncbi-id'></td></tr>"
                            + "            <tr><td><b>Scientific name</b></td><td data-element='scientific-name'></td></tr>"
                            + "            <tr><td><b>Kingdom</b></td><td data-element='kingdom'></td></tr>"
                            + "            <tr><td><b>Genetic Code</b></td><td data-element='genetic-code'></td></tr>"
                            + "        </table>"
                            + "        <div>"
                            + "            <div><span><b>Aliases</b></span></div>"
                            + "            <div data-element='aliases'></div>"
                            + "        </div>"
                            + "    </div>"
                            + "    <div class='col-md-6' data-element='lineage'>"
                            + "    </div>"
                            + "</div>",
                    additionalInfo: "<div class='row'>"
                                  + "    <div class='media col-md-12'>"
                                  + "        <div class='media-body'>"
                                  + "            <h4 class='media-heading' data-element='wiki_url'></h4>"
                                  + "            <div data-element='wikipedia_text'></div>"
                                  + "        </div>"
                                  + "        <div class='media-right media-middle'>"
                                  + "            <div data-element='wikipedia_image'></div>"
                                  + "        </div>"
                                  + "    </div>"
                                  + "</div>"
                };

            // VIEW

            function layout() {
                return div([
                    html.makePanel({
                        title: 'Summary',
                        content: div({id: 'overview'}, templates.overview)
                    }),
                    html.makePanel({
                        title: 'Children Taxons',
                        content: div({id: 'taxonChildren'}, html.loading())
                    }),                    
                    html.makePanel({
                        title: 'Additional Information for this Taxon',
                        content: div({id: 'moreTaxonInfo'}, templates.additionalInfo)
                    })
                ]);
            }

            function setDataElementHTML(element, value) {
                try {
                    container.querySelector("[data-element='" + element + "']").innerHTML = value;
                }
                catch (err) {
                    console.log("ERROR");
                    throw err;
                }
            }

            function renderLineage(name, name_lineage, ref_lineage) {
                var list_o_links = [], i, len = name_lineage.length;
                
                for (i = 0; i < len; i+=1) {
                    list_o_links.push("<div style='padding-left: " + String(i * 10) + "px'>"
                                    + "<a target='_blank' href='#dataview/" + ref_lineage[i] + "'>"
                                    + name_lineage[i] + "</a></div>");
                }
                list_o_links.push("<div style='padding-left: " + String(len * 10) + "px'>" + name + "</div>");
                
                setDataElementHTML('lineage', div([div("<h5><strong>Lineage</strong></h5>"),
                                                   div(list_o_links)]));
            }
            
            function renderAliases(aliases) {
                var alias_divs = [], i, len = aliases.length;
                
                for (i = 0; i < len; i+=1) {
                    alias_divs.push("<div class='col-sm-offset-1'>" + aliases[i] + "</div>");
                }
                setDataElementHTML('aliases', alias_divs.join(""));
            }
            
            function renderChildren(info) {
                var list_o_links = [],
                    i,
                    len = info.length,
                    sorted = info.sort(function (a,b) { return a[0].toLowerCase() > b[0].toLowerCase(); });
                
                for (i = 0; i < len; i+=1) {
                    list_o_links.push("<div><a target='_blank' href='#dataview/" + sorted[i][1] + "'>"
                                    + sorted[i][0] + "</a></div>");
                }
                
                container.querySelector('div[id="taxonChildren"]').innerHTML = div(list_o_links);
            }
            
            function renderNCBILink(taxid) {
                setDataElementHTML('ncbi-id',
                                   "<a target='_blank' href='http://www.ncbi.nlm.nih.gov/Taxonomy/"
                                 + "Browser/wwwtax.cgi?mode=info&id=" + taxid + "'>" + taxid + "</a>");
            }

            function renderWikipediaEntry(wikiInfo) {
                if (wikiInfo.link === undefined) {
                    setDataElementHTML('wiki_url', "No Wikipedia entry found for this Taxon");
                }
                else {
                    setDataElementHTML('wiki_url',
                                       "<a target='_blank' href='"
                                     + wikiInfo.link
                                     + "'>Wikipedia entry for this Taxon</a>");
                }
                                
                if (wikiInfo.extract === undefined) {
                    setDataElementHTML('wikipedia_text', "<div>No wiki text found</div>");
                }
                else {
                    setDataElementHTML('wikipedia_text', wikiInfo.extract);
                }
            }
            
            function renderWikipediaImage(imageURL) {
                console.log(imageURL);
                setDataElementHTML('wikipedia_image', "<img class='media-object' src='" + imageURL + "'></img>");                
            }
                        
            // WIDGET API

            function attach(node) {
                parent = node;
                container = parent.appendChild(document.createElement('div'));
                container.innerHTML = layout();
            }

            function start(params) {
                /* Need to create the taxon client object here because it requires params.
                 * The params is determined by the dataview route, which makes
                 * available:
                 *   workspaceId
                 *   objectId
                 *   objectVersion
                 *   ...
                 */
                                
                var taxon_ref = utils.getRef(params),
                    taxon,
                    scientific_name,
                    wikiInfo;
                
                Array.from(container.querySelectorAll("[data-element]")).forEach(function (e) {
                    e.innerHTML = html.loading();
                });
                
                function fetchWikipediaImageURL(name) {
                    var wiki_api_url = "https://en.wikipedia.org/w/api.php?",
                        query_params = "action=query&prop=pageimages|imageinfo"
                                     + "&indexpageids&iiprop=url&pithumbsize=600w&titles=Image:";
                    
                    return bluebird.resolve(jquery.ajax({
                        url: wiki_api_url + query_params + name + "&callback=?",
                        data: { format: 'json' },
                        dataType: 'jsonp'
                    }))
                    .then(function (data) {
                        console.log(data);
                        var pageid = data.query.pageids[0],
                            url = data.query.pages[pageid].thumbnail.source;
                        return url;
                    })
                    .catch(function (err) {
                        console.log(err);
                    });
                }
                
                function fetchWikipediaEntry(name) {
                    var wiki_api_url = "https://en.wikipedia.org/w/api.php?",
                        query1_params = "action=query&list=search&format=json"
                                      + "&srwhat=text&srsearch=",
                        query2_params = "action=query&prop=extracts|pageimages|imageinfo|images|info|pageimages|pageprops"
                                      + "&format=json&exlimit=1&exintro=&piprop=name"
                                      + "&inprop=url&indexpageids=&titles=";
                    
                    return bluebird.resolve(jquery.ajax({
                        url: wiki_api_url + query1_params + name + "&callback=?",
                        data: { format: 'json' },
                        dataType: 'jsonp'
                    }))
                    .then(function (data) {
                        var title = data.query.search[0].title;
                        
                        return bluebird.resolve(jquery.ajax({
                            url: wiki_api_url + query2_params + title + "&callback=?",
                            data: { format: 'json' },
                            dataType: 'jsonp'
                        }));
                    })
                    .then(function (data) {
                        console.log(data);
                        var pageid = data.query.pageids[0],
                            wikiInfo;
                            
                        try {
                            wikiInfo = {
                                extract: data.query.pages[pageid].extract,
                                image: data.query.pages[pageid].pageimage,
                                link: data.query.pages[pageid].fullurl
                            };
                        }
                        catch (err) {
                            console.log(err);
                            wikiInfo = { extract: undefined, image: undefined, link: undefined };
                        }
                            
                        return wikiInfo;
                    })
                    .catch(function (err) {
                        console.log(err);
                    });
                }

                
                function getTaxonClient(ref) {
                    return Taxon.client({
                        url: runtime.getConfig('services.taxon_api.url'),
                        token: runtime.service('session').getAuthToken(),
                        ref: ref
                    });
                }
                
                taxon = getTaxonClient(taxon_ref);
                                       
                return taxon.scientific_name().then(function (scientificName) {
                        setDataElementHTML('scientific-name', scientificName);
                        scientific_name = scientificName;
                        return fetchWikipediaEntry(scientificName);
                    })
                    .then(function (wiki_content) {
                        wikiInfo = wiki_content;
                        renderWikipediaEntry(wikiInfo);
                        return fetchWikipediaImageURL(wikiInfo.image);
                    })
                    .then(function (wikiImage) {
                        renderWikipediaImage(wikiImage);
                        return taxon.scientific_lineage();
                    })
                    .then(function (lineage) {
                        var refLineage = [];
                        
                        /*
                         * Call get_parent() and collect the reference until undefined is returned from the client.
                         * At that point, remove the 'root' reference and return the name lineage and reference lineage.
                         **/
                        function recursiveGetParent(t) {
                            return t.parent().then(function (parent_ref) {
                                if (parent_ref !== undefined) {
                                    refLineage.unshift(parent_ref);
                                    return recursiveGetParent(getTaxonClient(parent_ref));
                                }
                                else {
                                    // remove the 'root' element
                                    refLineage.splice(0,1);
                                    return [lineage, refLineage];
                                }
                            });
                        }
                        
                        return recursiveGetParent(taxon);
                    })
                    .then(function(lineages) {
                        renderLineage(scientific_name, lineages[0], lineages[1]);
                        return taxon.kingdom();
                    })
                    .then(function(kingdom) {
                        setDataElementHTML('kingdom', kingdom);
                        return taxon.taxonomic_id();
                    })
                    .then(function(taxid) {
                        renderNCBILink(taxid);
                        return taxon.genetic_code();
                    })
                    .then(function(geneticCode) {
                        setDataElementHTML('genetic-code', geneticCode);
                        return taxon.aliases();
                    })
                    .then(function(aliases) {
                        renderAliases(aliases);
                        return taxon.children();
                    })
                    .then(function(children_refs) {
                        // join together all the promises into a single array of child taxon info
                        return bluebird.all(children_refs.map(function (ref) {
                            return getTaxonClient(ref).scientific_name().then(function (name) {
                                return [name, ref];
                            });
                        }));    
                    })
                    .then(function (childrenInfo) {
                        renderChildren(childrenInfo);
                    })
                    .catch(function (err) {
                        console.log(err);
                    });
            }

            function stop() {
                // nothing to do
            }

            function detach() {
                // nothing to do necessarily, since the parent dom node will
                // be removed the controller for this widget removes it, 
                // but it is nice to take responsibility for undoing what we
                // changed in the parent node:
                if (parent && container) {
                    container.innerHTML = '';
                    parent.removeChild(container);
                }
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