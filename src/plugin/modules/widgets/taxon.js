/*global define */
/*jslint white: true, browser: true */
define([
    'kb/common/html',
    'kb/data/genomeAnnotation',
    'kb/data/taxon',
    'kb/data/assembly',
    '../utils',
    'bluebird',
    'jquery',
    'underscore'
],
    function (html, GenomeAnnotation, Taxon, Assembly, utils, bluebird, $, _) {
        'use strict';

        //http://localhost:8080/#dataview/1779/1006539/1
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
                    console.error('while setting data element "' + element + '":', err);
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
                if (wikiInfo === null || wikiInfo.link === undefined) {
                    setDataElementHTML('wiki_url', "No Wikipedia entry found for this Taxon");
                }
                else {
                    setDataElementHTML('wiki_url',
                                       "<a target='_blank' href='"
                                     + wikiInfo.link
                                     + "'>Wikipedia entry for this Taxon</a>");
                }
                                
                if (wikiInfo === null || wikiInfo.extract === undefined) {
                    setDataElementHTML('wikipedia_text', 'No text found');
                }
                else {
                    setDataElementHTML('wikipedia_text', wikiInfo.extract);
                }
            }
            
            function renderWikipediaImage(imageURL) {
                if (imageURL === null) {
                    setDataElementHTML('wikipedia_image', 'No image found');
                }
                else {
                    setDataElementHTML('wikipedia_image', "<img class='media-object' src='" + imageURL + "'></img>");
                }
            }

            /**
             * Return copy of string with rightmost space-separated token removed.
             *
             * @param s
             */
            function removeLastToken(s) {
                if (s == '') {
                    return ''
                }
                var a = s.split(' ');
                if (a.length <= 1) {
                    return ''
                }
                return _.initial(a).join(' ');
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
                
                var wiki_api_url = "https://en.wikipedia.org/w/api.php?";

                /**
                 * Get text and image from wikipedia.
                 *
                 * Calls: fetchWikipediaData, fetchWikipediaImage
                 *
                 * @param name Scientific name
                 * @returns {*}
                 */
                function fetchWikipediaEntry(name) {
                    //console.debug('fetchWikipediaEntry name="' + name + '"');
                    return fetchWikipediaData(name)
                        .then(function(data){
                            return fetchWikipediaImage(data);
                        })
                        .catch(function (err) {
                            console.error('while fetching wikipedia entry for "' + name + '":', err);
                            return false;
                        });
                }

                /**
                 * Look for the organism in wikipedia, and fetch the JSON
                 * version of the basic information.
                 *
                 * @param name
                 * @returns {*}
                 */
                function fetchWikipediaData(name) {
                    var query_params = "action=query&list=search&format=json"
                            + "&srwhat=text&srsearch=",
                        wiki_request_url = wiki_api_url + query_params + name; // "&callback=?";

                    //console.debug('Call Wikipedia url="' + wiki_request_url + '"');

                    return bluebird.resolve($.ajax({
                            url: wiki_request_url,
                            data: {format: 'json'},
                            dataType: 'jsonp'
                        }))
                        .then(function (data) {
                            // If nothing was found, try stripping the last token and
                            // re-issuing the query.
                            if (data.query.search.length == 0) {
                                var name2 = removeLastToken(name);
                                //console.debug('Stripped scientific name "' + name + '" down to "' + name2 + '"');
                                if (name2 == '') {
                                    throw new Error('No page found on Wikipedia for "' + name2 + '"');
                                }
                                data = fetchWikipediaData(name2);
                            }
                            return data;
                        });
                }

                /**
                 * Get wikipedia image info and add to the base wikipedia info.
                 *
                 * @param data Result object from fetchWikipediaData()
                 * @returns {object} Object with properties 'extract', 'image', and 'link'
                 */
                function fetchWikipediaImage(data) {
                    var query = data.query,
                        title = query.search[0].title,
                        query_params = "action=query&prop=extracts|pageimages|imageinfo|images|info|pageimages|pageprops"
                            + "&format=json&exlimit=1&exintro=&piprop=name"
                            + "&inprop=url&indexpageids=&titles=",
                        wiki_request_url = wiki_api_url + query_params + title;

                    return bluebird.resolve(
                        $.ajax({
                        url: wiki_request_url, // + "&callback=?",
                        data: {format: 'json'},
                        dataType: 'jsonp'
                        }).then(function (data) {
                            //console.debug('Images callback, data:', data);
                            var pageid = data.query.pageids[0];
                            return {
                                extract: data.query.pages[pageid].extract,
                                image: data.query.pages[pageid].pageimage,
                                link: data.query.pages[pageid].fullurl
                            };
                        })
                    ).catch (function(err) {
                        console.error('while fetching wikipedia image at "' + wiki_request_url + '":', err);
                        return {
                            extract: undefined,
                            image: undefined,
                            link: undefined
                        };
                    });
                }

                /**
                 * Get image data from Wikipedia
                 *
                 * @param name The canonical name for the page.
                 * @returns {*}
                 */
                function fetchWikipediaImageURL(name) {
                    if (name === undefined) {
                        return null;
                    }
                    var query_params = "action=query&prop=pageimages|imageinfo"
                            + "&indexpageids&iiprop=url&pithumbsize=600w&titles=Image:",
                        wiki_request_url = wiki_api_url + query_params + name + "&callback=?";

                    return bluebird.resolve($.ajax({
                            url: wiki_request_url,
                            data: { format: 'json' },
                            dataType: 'jsonp'
                        }))
                        .then(function (data) {
                            //console.debug("FetchWikipediaImage data:",data);
                            var pageid = data.query.pageids[0];
                            return data.query.pages[pageid].thumbnail.source;
                        })
                        .catch(function (err) {
                            console.error('while fetching wikipedia image at "' + wiki_request_url + '":', err);
                            return null;
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
                        if (wikiInfo === false) {
                            //console.debug('No wikiInfo');
                            renderWikipediaEntry(null);
                            return false;
                        }
                        else {
                            renderWikipediaEntry(wikiInfo);
                        }
                        return fetchWikipediaImageURL(wikiInfo.image);
                    })
                    .then(function (wikiImage) {
                        if (wikiImage === null) {
                            renderWikipediaImage(null);
                        }
                        else {
                            renderWikipediaImage(wikiImage);
                        }
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
                        console.error(err);
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