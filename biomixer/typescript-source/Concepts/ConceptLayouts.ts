///<reference path="headers/require.d.ts" />
///<reference path="headers/d3.d.ts" />

///<amd-dependency path="../JQueryExtension" />

///<amd-dependency path="GraphView" />
///<amd-dependency path="Menu" />
///<amd-dependency path="Concepts/ConceptPathsToRoot" />
///<amd-dependency path="Concepts/ConceptGraph" />


import GraphView = require("../GraphView");
import Menu = require("../Menu");
import ConceptGraphView = require("./ConceptPathsToRoot");
import ConceptGraph = require("./ConceptGraph");

export class ConceptLayouts {

    constructor(
        public forceLayout: D3.Layout.ForceLayout,
        public graph: ConceptGraph.ConceptGraph,
        public graphView: ConceptGraphView.ConceptPathsToRoot,
        public centralConceptUri: ConceptGraph.ConceptURI
    ){
        
    }
    
    
    addMenuComponents(menuSelector: string, softNodeCap: number){
        // Add the butttons to the pop-out panel
        var layoutsContainer = $("<div>").attr("id", "layoutMenuContainer");
        $(menuSelector).append(layoutsContainer);
                
        layoutsContainer.append($("<label>").addClass(Menu.Menu.menuLabelClass).text("Layouts"));
        layoutsContainer.append($("<br>"));
        
        layoutsContainer.append($("<input>")
                .attr("class", "layoutButton")
                .attr("id", "forceLayoutButton")
                .attr("type", "button")
                .attr("value", "Force-Directed Layout"));
        layoutsContainer.append($("<br>"));
        
        layoutsContainer.append($("<input>")
                .attr("class", "layoutButton")
                .attr("id", "circleLayoutButton")
                .attr("type", "button")
                .attr("value", "Circle Layout"));
        layoutsContainer.append($("<br>"));
        
        layoutsContainer.append($("<input>")
                .attr("class", "layoutButton")
                .attr("id", "centerLayoutButton")
                .attr("type", "button")
                .attr("value", "Center Layout"));
        layoutsContainer.append($("<br>"));
        
        layoutsContainer.append($("<input>")
            .attr("class", "layoutButton")
            .attr("id", "horizontalTreeLayoutButton")
            .attr("type", "button")
            .attr("value", "Horizontal Tree Layout"));
        layoutsContainer.append($("<br>"));
    
        layoutsContainer.append($("<input>")
            .attr("class", "layoutButton")
            .attr("id", "verticalTreeLayoutButton")
            .attr("type", "button")
            .attr("value", "Vertical Tree Layout"));
        layoutsContainer.append($("<br>"));
    
       layoutsContainer.append($("<input>")
            .attr("class", "layoutButton")
            .attr("id", "radialLayoutButton")
            .attr("type", "button")
            .attr("value", "Radial Layout"));
    
        
        d3.selectAll("#circleLayoutButton").on("click", this.applyNewLayout(this.runCircleLayoutLambda()));
        d3.selectAll("#forceLayoutButton").on("click", this.applyNewLayout(this.runForceLayoutLambda()));
        d3.selectAll("#centerLayoutButton").on("click", this.applyNewLayout(this.runCenterLayoutLambda()));
        d3.selectAll("#horizontalTreeLayoutButton").on("click", this.applyNewLayout(this.runHorizontalTreeLayoutLambda()));
        d3.selectAll("#verticalTreeLayoutButton").on("click", this.applyNewLayout(this.runVerticalTreeLayoutLambda()));
        d3.selectAll("#radialLayoutButton").on("click", this.applyNewLayout(this.runRadialLayoutLambda()));
        
    }
    
    applyNewLayout(layoutLambda){
        var outerThis = this;
        return ()=>{
            outerThis.graphView.setCurrentLayout(layoutLambda);
            outerThis.graphView.runCurrentLayout();
        };
    }
    
    private lastTransition = null;
    private staleTimerThreshold = 4000;
    private desiredDuration = 500;
    private transitionNodes(refresh?: boolean){
        var outerThis = this;
        var graphNodes = outerThis.graph.graphD3Format.nodes;
        var graphLinks = outerThis.graph.graphD3Format.links;
        
        var now = new Date().getTime();

        // When the graph is still growing, calls to the layout occur. This causes
        // a stuttering of movement if we do transitions, and without, the node
        // teleportation is confusing.
        // So, when we are refreshing a layout (node/edge addition), we need the
        // layout duration to continue along the path it was on. This *might* backfire
        // when we have an extremely long set of node or edge additions though.
        // If so, try having a minimum transition duration.
        var reduceDurationBy = 0;
        if(null !== this.lastTransition && refresh && (now - this.lastTransition) <= this.staleTimerThreshold){
            reduceDurationBy = now - this.lastTransition;
            // console.log("SHORTEN! By: "+reduceDurationBy);
        }
        var duration = this.desiredDuration - reduceDurationBy;
        
        d3.selectAll("g.node_g")
            .transition()
            .duration(duration)
            .ease("linear")
            .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

        d3.selectAll(GraphView.BaseGraphView.linkSvgClass)
            .transition()
            .duration(duration)
            .ease("linear")
            .attr("points", outerThis.graphView.computePolyLineLinkPointsFunc);
    
       if(this.lastTransition === null || !refresh || (now - this.lastTransition) > this.staleTimerThreshold){
            this.lastTransition = new Date().getTime();
       }
    }
    
    getAllOntologyAcronyms(){
       // console.log("returning ontologies");
        var ontologies = [];
        var outerThis = this;
        var graphNodes = outerThis.graph.graphD3Format.nodes;
        graphNodes.forEach(function(node){
            //console.log(node.ontologyAcronym);
            if($.inArray(node.ontologyAcronym, ontologies) === -1){
                ontologies.push(node.ontologyAcronym);
            }
        });
           
        return ontologies;
    }
    
     
    getChildren(parentNode: ConceptGraph.Node){
        var outerThis = this;
        var graphNodes = outerThis.graph.graphD3Format.nodes;
        var graphLinks = outerThis.graph.graphD3Format.links;
        var children: ConceptGraph.Node[] = [];

        //can be pushing multiple children..
        graphLinks.forEach(function(link){
            if(link.sourceId==parentNode.rawConceptUri&&link.relationType!="maps to"){
                graphNodes.forEach(function(node){
                    if(node.rawConceptUri == link.targetId && $.inArray(node, children) === -1){
                        children.push(node);
                    }
                });               
            }
        });
    
        return children;
    }
    
    calculateDepth(parentNode: ConceptGraph.Node){
        var outerThis = this;

        var children = outerThis.getChildren(parentNode);
        //console.log(children);
        if(children.length<=0){
            return;
        }else{
            children.forEach(function(child){
                if(child.tempDepth <= parentNode.tempDepth){
                    child.tempDepth = parentNode.tempDepth+1;
                }
                outerThis.calculateDepth(child);
            });
        }
    }
    
    getRoots(ontologyAcronym){
        var outerThis = this;
        var graphNodes = outerThis.graph.graphD3Format.nodes;
        var graphLinks = outerThis.graph.graphD3Format.links;
        var roots: ConceptGraph.Node[] = [];       
        var isRoot = true;    
        var graphLinks = graphLinks.filter(function(l){return l.relationType!="maps to"});
        graphNodes = graphNodes.filter(function(n){return n.ontologyAcronym==ontologyAcronym});
        graphNodes.forEach(function(node){
            graphLinks.forEach(function(link){
               if (link.targetId===node.rawConceptUri) { isRoot = false; }
            });
            if(isRoot) { roots.push(node); }       
            
            isRoot = true;
        });
        return roots;
    }
    
    buildTree(width, height, ontologies){
        var outerThis = this;
        var graphNodes = outerThis.graph.graphD3Format.nodes;

        width = width/ontologies.length;
 
        //reset depth for next layout
        graphNodes.forEach(function (node){ node.tempDepth = 0; });
        
        for (var i=0; i< ontologies.length; i++){
           var primary_root = new ConceptGraph.Node();
           primary_root.name = "ontology_phantom_root"; //temporary identifier for the root
           
           //find how many roots here and store them into roots
           var roots: ConceptGraph.Node[];
           roots = outerThis.getRoots(ontologies[i]);   
         
           var allChildren: ConceptGraph.Node[] = [];
           
           //calculate depth for all roots here 
           roots.forEach(function(root){
                outerThis.calculateDepth(root);
                if($.inArray(root, allChildren) === -1){ allChildren.push(root); }
           });
        
           var tree = d3.layout.tree()
                .size([width, height])
                .children(function(parent: ConceptGraph.Node){ 
                    if(parent.name == "ontology_phantom_root"){  
                        return roots;
                    }else{
                        var actualChildren = outerThis.getChildren(parent); 
                        var treeChildren: ConceptGraph.Node[] = [];
 
                        actualChildren.forEach(function(child){
                            if(child.tempDepth === parent.tempDepth+1 && $.inArray(child, allChildren) === -1){
                                treeChildren.push(child);
                                allChildren.push(child);
                            }
                        });
              
                        return treeChildren;
                    }
                });
            
            tree.nodes(primary_root);  
           
        }                 
    }
    
    runRadialLayoutLambda(){
        var outerThis = this;
        return function(refreshLayout?: boolean){
        	if(refreshLayout){
    			// Act normal, redo the whole layout
    		}
    		
            outerThis.forceLayout.stop();
            var graphNodes = outerThis.graph.graphD3Format.nodes;

            var treeWidth = 360;
            var treeHeight = outerThis.graphView.visHeight()/2-100; 
            var ontologies = outerThis.getAllOntologyAcronyms();

            outerThis.buildTree(treeWidth, treeHeight, ontologies);
            for (var j=0; j<ontologies.length; j++){
                var increment= treeWidth/ontologies.length*j;
                var ontologyNodes = graphNodes.filter(function (d, i){return d.ontologyAcronym==ontologies[j]});
            
                $.each(ontologyNodes, function(index, element){
                        var radius = element.y+20*(ontologies.length-1);//make an offset if more than one ontology
                        var angle = (element.x+increment)/180 * Math.PI;
                        ontologyNodes[index].x = outerThis.graphView.visWidth()/2 + radius*Math.cos(angle); 
                        ontologyNodes[index].y = outerThis.graphView.visHeight()/2 + radius*Math.sin(angle); 
                    }
                );
            }
            
            outerThis.transitionNodes(refreshLayout);
        };
    }

    runVerticalTreeLayoutLambda(){
        var outerThis = this;
        return function(refreshLayout?: boolean){
        	if(refreshLayout){
    			// Act normal, redo the whole layout
    		}
    		
            outerThis.forceLayout.stop();
            var graphNodes = outerThis.graph.graphD3Format.nodes;

            var treeWidth = outerThis.graphView.visWidth();
            var treeHeight = outerThis.graphView.visHeight()-300; 
            
            var ontologies = outerThis.getAllOntologyAcronyms();
            outerThis.buildTree(treeWidth, treeHeight, ontologies);
            
            for (var j=0; j<ontologies.length; j++){
                var increment= treeWidth/ontologies.length*j;
                var ontologyNodes = graphNodes.filter(function (d, i){return d.ontologyAcronym==ontologies[j]});
                $.each(ontologyNodes, function(index, element){
                      ontologyNodes[index].x = element.x+increment; 
                      ontologyNodes[index].y = element.y+150; 

                    }
                );
            }         
            outerThis.transitionNodes(refreshLayout);
        };
    }
    
    runHorizontalTreeLayoutLambda(){
        var outerThis = this;
        return function(refreshLayout?: boolean){
        	if(refreshLayout){
    			// Act normal, redo the whole layout
    		}
    		
            outerThis.forceLayout.stop();
            var graphNodes = outerThis.graph.graphD3Format.nodes;

            var treeWidth = outerThis.graphView.visHeight()-100;
            var treeHeight = outerThis.graphView.visWidth()-300;   
                   
            var ontologies = outerThis.getAllOntologyAcronyms();

            outerThis.buildTree(treeWidth, treeHeight, ontologies);  

            for (var j=0; j<ontologies.length; j++){
                var increment= treeWidth/ontologies.length*j;

                var ontologyNodes = graphNodes.filter(function (d, i){return d.ontologyAcronym==ontologies[j]});
                $.each(ontologyNodes, function(index, element){
                      var xValue = element.x;
                      ontologyNodes[index].x = element.y + 150; 
                      ontologyNodes[index].y = xValue+increment; 
                });
            }     
            outerThis.transitionNodes(refreshLayout);
        };
    }
    
    runCircleLayoutLambda(){
        var outerThis = this;
        return function(refreshLayout?: boolean){
        	if(refreshLayout){
    			// Act normal, redo the whole layout
    		}
                        
            outerThis.forceLayout.stop();
            var graphNodes = outerThis.graph.graphD3Format.nodes;
            var graphLinks = outerThis.graph.graphD3Format.links;
                
            var numberOfConcepts = Object.keys(graphNodes).length;
    
            var anglePerNode =2*Math.PI / numberOfConcepts; // 360/numberOfMappedOntologies;
            var arcLength = outerThis.graphView.linkMaxDesiredLength();
            var i = 0;
            
            $.each(graphNodes,
                function(index, element){
                    var acronym = index;
    
                    if(typeof acronym === "undefined"){
                        console.log("Undefined concept entry");
                    }
                    
                    var angleForNode = i * anglePerNode; 
                    i++;
                    graphNodes[index].x = outerThis.graphView.visWidth()/2 + arcLength*Math.cos(angleForNode); // start in middle and let them fly outward
                    graphNodes[index].y = outerThis.graphView.visHeight()/2 + arcLength*Math.sin(angleForNode); // start in middle and let them fly outward
                }
            );
            
            outerThis.transitionNodes(refreshLayout);
    
        };
    }
    
    runCenterLayoutLambda(){
        var outerThis = this;
        return function(refreshLayout?: boolean){
        	if(refreshLayout){
    			// Act normal, redo the whole layout
    		}
            
            outerThis.forceLayout.stop();
            var graphNodes = outerThis.graph.graphD3Format.nodes;
            var graphLinks = outerThis.graph.graphD3Format.links;
                
            var numberOfConcepts = Object.keys(graphNodes).length-1;
    
            var anglePerNode =2*Math.PI / numberOfConcepts; // 360/numberOfMappedOntologies;
            var arcLength = outerThis.graphView.linkMaxDesiredLength();
            var i = 0;
            
            $.each(graphNodes,
                function(acronym, node){
                    if(typeof acronym === "undefined"){
                        console.log("Undefined concept entry");
                    }
                    
                    if(node.rawConceptUri!=outerThis.centralConceptUri){
                        var angleForNode = i * anglePerNode; 
                        i++;
                        node.x = outerThis.graphView.visWidth()/2 + arcLength*Math.cos(angleForNode); // start in middle and let them fly outward
                        node.y = outerThis.graphView.visHeight()/2 + arcLength*Math.sin(angleForNode); // start in middle and let them fly outward
                    }else{
                        node.x = outerThis.graphView.visWidth()/2; 
                        node.y = outerThis.graphView.visHeight()/2;
                        
                        //alert(node.id+centralConceptUri);
                    }
                }
            );
            outerThis.transitionNodes(refreshLayout);
        };
    }
    
    
    runForceLayoutLambda(){
        var outerThis = this;
        return function(refreshLayout?: boolean): void{
            if(refreshLayout){
                // If we add a node to force layout, reheat it slightly
                outerThis.forceLayout.resume();
                return;
            }
            
            outerThis.forceLayout.friction(0.3) // use 0.2 friction to get a very circular layout
            .gravity(0.05) // 0.5
            .charge(-30); // -100
            
            outerThis.forceLayout.on("tick", outerThis.graphView.onLayoutTick());
            outerThis.forceLayout.start();
    
        };
    }
    
}